import nodemailer from "nodemailer";
import axios from "axios";
import { logger } from "../utils/logger.js";
import { smtpConfig, twilioConfig, telegramConfig } from "../config/env.js";

const emailConfigValid = smtpConfig.isConfigured();

const mailTransport = emailConfigValid ? nodemailer.createTransport({
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.secure,
  auth: {
    user: smtpConfig.user,
    pass: smtpConfig.pass,
  },
}) : null;

async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

export async function sendEmailNotification(to, subject, text) {
  if (!emailConfigValid) {
    logger.warn("Email no configurado, saltando notificación", { to, subject });
    return;
  }

  try {
    await retryOperation(() => mailTransport.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      text,
      html: text.replace(/\n/g, "<br>"),
    }));
    logger.info("Email enviado exitosamente", { to, subject });
  } catch (err) {
    logger.error("Error enviando email", { to, subject, error: err.message });
    throw err;
  }
}

export async function sendWhatsAppNotification(to, message) {
  if (!twilioConfig.isConfigured()) {
    logger.debug("Twilio no configurado, saltando WhatsApp");
    return;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`;
    
    await retryOperation(() => axios.post(url, new URLSearchParams({
      From: twilioConfig.whatsappFrom,
      To: to,
      Body: message,
    }), {
      auth: {
        username: twilioConfig.accountSid,
        password: twilioConfig.authToken,
      },
    }));
    
    logger.info("WhatsApp enviado exitosamente", { to });
  } catch (err) {
    logger.error("Error enviando WhatsApp", { to, error: err.message });
  }
}

export async function sendTelegramNotification(message) {
  if (!telegramConfig.isConfigured()) {
    logger.debug("Telegram no configurado, saltando notificación");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
    
    await retryOperation(() => axios.post(url, {
      chat_id: telegramConfig.chatId,
      text: message,
      parse_mode: "HTML",
    }));
    
    logger.info("Telegram enviado exitosamente");
  } catch (err) {
    logger.error("Error enviando Telegram", { error: err.message });
  }
}

export async function notifyOnAlert(user, alert) {
  if (!user || !alert) {
    logger.warn("notifyOnAlert llamado con datos inválidos", { user: !!user, alert: !!alert });
    return;
  }

  const severityMap = {
    CRITICAL: "CRÍTICA",
    WARNING: "ADVERTENCIA",
    INFO: "INFORMATIVA",
  };

  const severityLabel = severityMap[alert.type] || alert.type;
  const baseText = `[${severityLabel}] ${alert.title}\n${alert.description || ""}`;

  const promises = [];

  if (user.email) {
    promises.push(
      sendEmailNotification(
        user.email,
        `C4A Alerts · ${severityLabel}`,
        baseText
      ).catch(err => logger.error("Error en email notification", { error: err.message }))
    );
  }

  if ((alert.type === "WARNING" || alert.type === "CRITICAL") && user.whatsapp) {
    promises.push(
      sendWhatsAppNotification(user.whatsapp, baseText)
    );
  }

  if (alert.type === "CRITICAL") {
    promises.push(
      sendTelegramNotification(`<b>${severityLabel}</b>\n${baseText}`)
    );
  }

  await Promise.allSettled(promises);
}

