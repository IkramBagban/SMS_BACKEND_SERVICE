import { createServer } from "../common.js";
import { SMSProvider } from "../providers/sms.js";

export const jioProvider = new SMSProvider("Jio", 200, 5173);
createServer(jioProvider);
