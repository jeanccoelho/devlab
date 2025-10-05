import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/.server/llm/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import { requireAuth, createSupabaseServerClient } from '~/lib/supabase.server';
import type { Database } from '~/types/database';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    const session = await requireAuth(request);
    console.log('Session obtained:', !!session, 'User ID:', session.user.id);

    const supabase = createSupabaseServerClient(request);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('token_balance')
    .eq('id', session.user.id)
    .maybeSingle<{ token_balance: number }>();

  if (!profile || profile.token_balance < 10) {
    throw new Response(
      JSON.stringify({ error: 'Saldo de tokens insuficiente. Por favor, adquira mais tokens.' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages } = await request.json<{ messages: Messages }>();

  const stream = new SwitchableStream();

  try {
    const options: StreamingOptions = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason, usage }) => {
        const tokensUsed = (usage?.promptTokens || 0) + (usage?.completionTokens || 0);

        await (supabase.rpc as any)('consume_tokens', {
          p_user_id: session.user.id,
          p_tokens: Math.ceil(tokensUsed / 1000),
          p_model_used: 'claude-3-sonnet',
          p_prompt_tokens: usage?.promptTokens || 0,
          p_completion_tokens: usage?.completionTokens || 0,
        });

        if (finishReason !== 'length') {
          return stream.close();
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamText(messages, context.cloudflare.env, options);

        return stream.switchSource(result.toAIStream());
      },
    };

    const result = await streamText(messages, context.cloudflare.env, options);

    stream.switchSource(result.toAIStream());

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.log(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
  } catch (authError: any) {
    console.error('Auth error details:', {
      message: authError?.message,
      status: authError?.status,
      headers: request.headers.get('Authorization') ? 'present' : 'missing',
    });

    return new Response(
      JSON.stringify({ error: 'Não autorizado. Por favor, faça login novamente.' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
