import { createServer } from "../common.js";
import { SMSProvider } from "../providers/sms.js";

export const viProvider = new SMSProvider("Vi", 100, 5273);
createServer(viProvider);
