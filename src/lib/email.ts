import sgMail from '@sendgrid/mail'

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@smakowalo.pl'

if (apiKey && !apiKey.includes('your_sendgrid_api_key_here')) {
  sgMail.setApiKey(apiKey)
  console.log('✅ SendGrid initialized with API key')
} else {
  console.log('⚠️ SendGrid not configured - emails will be mocked')
}

// Email template interfaces
interface EmailTemplate {
  to: string | string[]
  subject: string
  html: string
  text?: string
  templateId?: string
  dynamicTemplateData?: Record<string, any>
}

interface OrderConfirmationData {
  customerName: string
  orderNumber: string
  orderItems: Array<{
    name: string
    quantity: number
    price: number
  }>
  totalAmount: number
  deliveryDate: string
  deliveryAddress: string
}

interface PasswordResetData {
  customerName: string
  resetLink: string
  expirationTime: string
}

interface RecipeShareData {
  recipeName: string
  recipeUrl: string
  senderName: string
  personalMessage?: string
}

// Email sending utility
async function sendEmail(emailData: EmailTemplate): Promise<boolean> {
  if (!apiKey || apiKey.includes('your_sendgrid_api_key_here')) {
    // Mock email sending in development
    console.log('📧 MOCK EMAIL SENT:', {
      to: emailData.to,
      subject: emailData.subject,
      from: fromEmail,
      preview: emailData.html.substring(0, 100) + '...'
    })
    return true
  }

  try {
    const msg = {
      to: emailData.to,
      from: fromEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      templateId: emailData.templateId,
      dynamicTemplateData: emailData.dynamicTemplateData
    }

    await sgMail.send(msg)
    console.log('✅ Email sent successfully to:', emailData.to)
    return true
  } catch (error) {
    console.error('❌ SendGrid email error:', error)
    return false
  }
}

// Order confirmation email
export async function sendOrderConfirmation(
  email: string,
  data: OrderConfirmationData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7CB342; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .order-item { padding: 10px 0; border-bottom: 1px solid #ddd; }
        .total { font-weight: bold; font-size: 1.2em; color: #7CB342; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍽️ Smakowało</h1>
          <h2>Potwierdzenie zamówienia</h2>
        </div>
        <div class="content">
          <p>Cześć ${data.customerName}!</p>
          <p>Dziękujemy za złożenie zamówienia w Smakowało. Oto szczegóły Twojego zamówienia:</p>

          <h3>📋 Zamówienie #${data.orderNumber}</h3>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${data.orderItems.map(item => `
              <div class="order-item">
                <strong>${item.name}</strong><br>
                Ilość: ${item.quantity} × ${item.price.toFixed(2)} zł
              </div>
            `).join('')}

            <div style="margin-top: 20px;" class="total">
              Łączna kwota: ${data.totalAmount.toFixed(2)} zł
            </div>
          </div>

          <h3>🚚 Dostawa</h3>
          <p><strong>Data dostawy:</strong> ${data.deliveryDate}</p>
          <p><strong>Adres dostawy:</strong> ${data.deliveryAddress}</p>

          <p>Twoje świeże składniki i przepisy zostaną dostarczone punktualnie!</p>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>💡 Przydatne informacje:</strong><br>
            • Sprawdź instrukcje przygotowania w aplikacji<br>
            • Składniki są świeże - przechowuj w lodówce<br>
            • Masz pytania? Napisz do nas: pomoc@smakowalo.pl
          </div>
        </div>

        <div class="footer">
          <p>Smakowało - Zestaw posiłków dla zapracowanych</p>
          <p>📧 czesc@smakowalo.pl | 📞 +48 999 999 999</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: email,
    subject: `Potwierdzenie zamówienia #${data.orderNumber} - Smakowało`,
    html,
    text: `Cześć ${data.customerName}! Dziękujemy za zamówienie #${data.orderNumber}. Dostawa: ${data.deliveryDate}. Kwota: ${data.totalAmount.toFixed(2)} zł.`
  })
}

// Password reset email
export async function sendPasswordReset(
  email: string,
  data: PasswordResetData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7CB342; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #7CB342; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .security-note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Smakowało</h1>
          <h2>Reset hasła</h2>
        </div>
        <div class="content">
          <p>Cześć ${data.customerName}!</p>
          <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w Smakowało.</p>

          <div style="text-align: center;">
            <a href="${data.resetLink}" class="button">Zresetuj hasło</a>
          </div>

          <div class="security-note">
            <strong>⚠️ Informacje dotyczące bezpieczeństwa:</strong><br>
            • Link jest ważny przez ${data.expirationTime}<br>
            • Użyj tego linku tylko jeśli rzeczywiście chcesz zmienić hasło<br>
            • Jeśli to nie Ty prosiłeś o reset, zignoruj tę wiadomość
          </div>

          <p>Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:</p>
          <p style="word-break: break-all; color: #666;">${data.resetLink}</p>

          <p>Jeśli nie prosiłeś o reset hasła, po prostu zignoruj tę wiadomość.</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
          <p>Smakowało - Bezpieczne konto, smaczne posiłki</p>
          <p>📧 pomoc@smakowalo.pl | 📞 +48 999 999 999</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: email,
    subject: 'Reset hasła - Smakowało',
    html,
    text: `Cześć ${data.customerName}! Kliknij link aby zresetować hasło: ${data.resetLink} (ważny przez ${data.expirationTime})`
  })
}

// Recipe sharing email
export async function sendRecipeShare(
  email: string,
  data: RecipeShareData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7CB342; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .recipe-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7CB342; }
        .button { display: inline-block; background: #7CB342; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👨‍🍳 Smakowało</h1>
          <h2>Ktoś podzielił się z Tobą przepisem!</h2>
        </div>
        <div class="content">
          <p><strong>${data.senderName}</strong> przesłał Ci przepis z Smakowało:</p>

          <div class="recipe-card">
            <h3>🍽️ ${data.recipeName}</h3>
            ${data.personalMessage ? `<p><em>"${data.personalMessage}"</em></p>` : ''}
          </div>

          <div style="text-align: center;">
            <a href="${data.recipeUrl}" class="button">Zobacz przepis</a>
          </div>

          <p>Odkryj pełne instrukcje przygotowania, listę składników i porady szefa kuchni!</p>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>💡 Co znajdziesz w przepisie:</strong><br>
            • Szczegółowe instrukcje krok po kroku<br>
            • Listę wszystkich składników<br>
            • Porady profesjonalnych kucharzy<br>
            • Informacje żywieniowe
          </div>

          <p>Nie masz jeszcze konta w Smakowało? <a href="https://smakowalo.pl/register">Zarejestruj się</a> i odkryj setki przepisów!</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
          <p>Smakowało - Dziel się smakiem z bliskimi</p>
          <p>📧 czesc@smakowalo.pl | 📞 +48 999 999 999</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: email,
    subject: `${data.senderName} przesłał Ci przepis: ${data.recipeName}`,
    html,
    text: `${data.senderName} przesłał Ci przepis "${data.recipeName}" z Smakowało! Zobacz: ${data.recipeUrl}`
  })
}

// Newsletter subscription email
export async function sendNewsletterWelcome(
  email: string,
  name: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7CB342; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Witaj w Smakowało!</h1>
        </div>
        <div class="content">
          <p>Cześć ${name}!</p>
          <p>Dziękujemy za zapisanie się do newslettera Smakowało! Będziesz otrzymywać:</p>

          <ul>
            <li>🆕 Najnowsze przepisy każdego tygodnia</li>
            <li>💡 Porady kulinarne od profesjonalnych szefów kuchni</li>
            <li>🎁 Ekskluzywne promocje i zniżki</li>
            <li>📅 Sezonowe menu i specjalne okazje</li>
          </ul>

          <p>Życzymy miłego gotowania!</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: email,
    subject: 'Witaj w społeczności Smakowało! 🍽️',
    html,
    text: `Cześć ${name}! Dziękujemy za zapisanie się do newslettera Smakowało. Będziesz otrzymywać najnowsze przepisy i porady kulinarne!`
  })
}

export { sendEmail }
