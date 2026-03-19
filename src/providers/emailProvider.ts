import nodemailer from 'nodemailer';
import logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

// Use explicit configuration for better reliability on cloud platforms like Render
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // Using 465 for SSL/TLS
  secure: true,
  pool: true, // Use pooling for background worker efficiency
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.MAIL_FROM,
    pass: process.env.MAIL_PASS,
  },
  // Add timeout settings to catch issues early
  connectionTimeout: 15000, // 15s - slightly more generous for cloud
  greetingTimeout: 15000,
  socketTimeout: 30000, // 30s
});

// Added a quick verify to help debugging on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP Connection Validation Error:', error);
  } else {
    logger.info('SMTP Server is ready to take our messages');
  }
});

export const sendEmailProvider = async (to: string, template: string, data: any) => {
  try {
    const { 
      paymentId, 
      selectedItems, 
      totalAmount, 
      subtotal, 
      discountAmount, 
      isCouponApplied, 
      status = "success" 
    } = data;

    const isSuccess = status === "success";
    const displayPaymentId = paymentId && typeof paymentId === 'string' ? paymentId.slice(-8).toUpperCase() : "FAILED";

    const itemsList = selectedItems ? Object.values(selectedItems) : [];
    const itemsHtml = itemsList
      .map((item: any) => `
      <tr>
        <td style="padding: 15px 0; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #1c1c1c; font-size: 15px;">${item.name || "Food Item"}</div>
          <div style="font-size: 12px; color: #828282;">Qty: ${item.selectedCount || 0}</div>
        </td>
        <td style="padding: 15px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #1c1c1c;">
          ₹${(item.cost || 0) * (item.selectedCount || 0)}
        </td>
      </tr>
    `).join("");

    const mailOptions = {
      from: `"DS FOOD Delivery" <${process.env.MAIL_FROM}>`,
      to,
      subject: isSuccess
        ? `Order Confirmed: Your delicious meal is on the way! 🍔`
        : `Payment Failed: Don't let your hunger wait! 🍕`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', Arial, sans-serif !important; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7f6;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background: ${isSuccess ? 'linear-gradient(135deg, #ff4d4d, #f97316)' : 'linear-gradient(135deg, #4b5563, #1f2937)'}; padding: 50px 40px;">
                      <div style="background: #ffffff; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <span style="font-size: 30px;">${isSuccess ? '🚚' : '❌'}</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                        ${isSuccess ? 'Order Confirmed!' : 'Payment Failed'}
                      </h1>
                    </td>
                  </tr>

                  <!-- Order Details -->
                  <tr>
                    <td style="padding: 40px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td>
                            <div style="font-size: 12px; color: #828282; text-transform: uppercase;">Order ID</div>
                            <div style="font-size: 18px; color: #1c1c1c; font-weight: 700;">#${displayPaymentId}</div>
                          </td>
                          <td align="right">
                             <div style="font-size: 12px; color: ${isSuccess ? '#00864e' : '#b91c1c'}; font-weight: 700;">${status.toUpperCase()}</div>
                          </td>
                        </tr>
                      </table>

                      <div style="margin: 30px 0; height: 1px; background: #eee;"></div>

                      <!-- Items Table -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <thead>
                          <tr>
                            <th align="left" style="font-size: 13px; color: #828282;">ITEM</th>
                            <th align="right" style="font-size: 13px; color: #828282;">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
                        <tr>
                          <td style="color: #828282;">Subtotal</td>
                          <td align="right" style="font-weight: 600;">₹${subtotal || totalAmount}</td>
                        </tr>
                        ${isCouponApplied ? `
                        <tr>
                          <td style="color: #10b981; font-weight: 600;">Coupon Discount</td>
                          <td align="right" style="color: #10b981; font-weight: 600;">-₹${discountAmount}</td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding-top: 15px; font-size: 20px; font-weight: 800; border-top: 2px solid #1c1c1c;">Total</td>
                          <td align="right" style="padding-top: 15px; font-size: 20px; font-weight: 800; border-top: 2px solid #1c1c1c;">₹${totalAmount}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Bill email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (err) {
    logger.error('Error sending email through provider:', err);
    throw err;
  }
};
