"use strict";
import { Context, Context as GrammyContext, Bot } from "grammy";
import { Context as VkContext, VK, MessageContext } from "vk-io";


interface UnifiedContext {
  source: 'telegram' | 'vk';
  text: string;
  date: Date;
  from: {
    id: number;
  };
  chat_id: number;
  send: (chatId: number, text: string) => void;
  reply: (text: string) => void;
  sendPhoto: (chatId: number, photo: string, caption?: string) => void;
  replyPhoto: (photo: string, caption?: string) => void;
}

interface UnifiedResponse {
  message_id: number;
}

interface UnifiedError {
  code: number;
  description: string;
}

class UnifiedHearHandler {
  constructor(
    private handler: (ctx: UnifiedContext) => Promise<void>,
  ) {}

  async handle(ctx: Context | VkContext) {
    if (ctx instanceof GrammyContext) {
      await this.handler({
        source: 'telegram',
        text: ctx.message?.text || '',
        date: new Date((ctx.message?.date ?? 0) * 1000),
        from: {
          id: ctx.message?.from?.id || 0,
        },
        chat_id: ctx.message?.chat.id || 0,
        send: async (chatId, text) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.api.sendMessage(chatId, text).then(function _<UnifiedResponse>(res: any) {
              resolve(res);
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
        reply: async (text) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.api.sendMessage(ctx.message?.chat.id || 0, text, { reply_to_message_id: ctx.message?.message_id }).then(function _<UnifiedResponse>(res: any) {
              resolve(res);
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
        sendPhoto: async (chatId, photo, caption) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.api.sendPhoto(chatId, photo, { caption }).then(function _<UnifiedResponse>(res: any) {
              resolve(res);
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
        replyPhoto: async (photo, caption) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.api.sendPhoto(ctx.message?.chat.id || 0, photo, { caption, reply_to_message_id: ctx.message?.message_id }).then(function _<UnifiedResponse>(res: any) {
              resolve(res);
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
      });
    } else if (ctx instanceof MessageContext) {
      await this.handler({
        source: 'vk',
        text: ctx.text || '',
        date: new Date(ctx.createdAt),
        from: {
          id: ctx.senderId,
        },
        chat_id: ctx.peerId,
        send: async (chatId, text) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.send(text).then(function _<UnifiedResponse>(res: MessageContext) {
              resolve({ message_id: res.id });
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
        reply: async (text) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.send(text, { reply_to: ctx.id }).then(function _<UnifiedResponse>(res: MessageContext) {
              resolve({ message_id: res.id });
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
        sendPhoto: async (chatId, photo, caption) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.sendPhoto({ value: photo, filename: 'photo.jpg' }, { message: caption }).then(function _<UnifiedResponse>(res: MessageContext) {
              resolve({ message_id: res.id });
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
        replyPhoto: async (photo, caption) => {
          return new Promise<UnifiedResponse>((resolve, reject) => {
            ctx.sendPhoto({ value: photo, filename: 'photo.jpg' }, { message: caption, reply_to: ctx.id }).then(function _<UnifiedResponse>(res: MessageContext) {
              resolve({ message_id: res.id });
            }).catch(function _<UnifiedError>(err: UnifiedError) {
              reject(err);
            });
          });
        },
      });
    }
  }
}

class AnyBot {
  constructor(
    private bot: Bot | VK,
  ) {}

  hear(pattern: RegExp, handler: (ctx: UnifiedContext) => Promise<void>) {
    const unifiedHandler = new UnifiedHearHandler(handler);
    if (this.bot instanceof Bot) {
      this.bot.hears(pattern, unifiedHandler.handle.bind(unifiedHandler));
    } else if (this.bot instanceof VK) {
      this.bot.updates.on('message_new', async (ctx:any) => {
        if (ctx.text && pattern.test(ctx.text)) {
          await unifiedHandler.handle(ctx);
        }
      });
    }
  }

  start() {
    if (this.bot instanceof Bot) {
      this.bot.start();
    } else if (this.bot instanceof VK) {
      this.bot.updates.start().catch(console.error);
    }
  }

  stop() {
    if (this.bot instanceof Bot) {
      this.bot.stop();
    } else if (this.bot instanceof VK) {
      this.bot.updates.stop();
    }
  }
}

class BotFactory {
  static createTelegramBot(token: string) {
    return new AnyBot(new Bot(token));
  }

  static createVkBot(token: string) {
    return new AnyBot(new VK({ token }));
  }
}

export {
  AnyBot,
  BotFactory,
  UnifiedContext,
  UnifiedResponse,
  UnifiedError,
};
