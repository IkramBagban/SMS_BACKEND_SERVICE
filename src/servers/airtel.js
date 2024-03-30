import { createServer } from "../common.js";
import { SMSProvider } from "../providers/sms.js";

export const airtelProvider = new SMSProvider("Airtel", 200, 5073);
createServer(airtelProvider);
