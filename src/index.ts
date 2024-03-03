// create 2 bots from library
import * as lib from './lib/lib';

const tgbot = lib.BotFactory.createTelegramBot('tg-token');
const vkbot = lib.BotFactory.createVkBot('vk-token');

// create handlers for both bots
async function hello(ctx: lib.UnifiedContext) {
    return ctx.reply('Hello!');
}
tgbot.hear(/hello/i, hello);
vkbot.hear(/hello/i, hello);

// start both bots
tgbot.start();
vkbot.start();
