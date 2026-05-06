/**
 * Email template for Super Admin Discount Approval Request
 */
export function getDiscountApprovalEmailTemplate(data: {
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  salesRepName: string;
  requestedDiscount: number;
  basePriceBeforeDiscount: number;
  finalPriceAfterDiscount: number;
  reason: string;
  budgetDetails?: string;
  campaignDetails?: string;
  reviewLink: string;
}) {
  const subject = `🔔 Discount Approval Required: ${data.requestedDiscount}% for ${data.leadName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discount Approval Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Discount Approval Required</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea; font-size: 18px;">📋 Lead Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Customer Name:</td>
          <td style="padding: 8px 0;">${data.leadName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Phone:</td>
          <td style="padding: 8px 0;">${data.leadPhone}</td>
        </tr>
        ${data.leadEmail ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Email:</td>
          <td style="padding: 8px 0;">${data.leadEmail}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Sales Rep:</td>
          <td style="padding: 8px 0;">${data.salesRepName}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
      <h2 style="margin-top: 0; color: #f59e0b; font-size: 18px;">💰 Pricing Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Base Price:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 18px;">₹${data.basePriceBeforeDiscount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">Requested Discount:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #dc2626; font-weight: 600;">${data.requestedDiscount}%</td>
        </tr>
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 12px 0; font-weight: 600; font-size: 16px;">Final Price:</td>
          <td style="padding: 12px 0; text-align: right; font-size: 20px; font-weight: 700; color: #059669;">₹${data.finalPriceAfterDiscount.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #8b5cf6;">
      <h2 style="margin-top: 0; color: #8b5cf6; font-size: 18px;">📝 Request Details</h2>
      <p style="margin: 0;"><strong>Reason:</strong></p>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0;">${data.reason}</p>
      
      ${data.budgetDetails ? `
      <p style="margin: 16px 0 0;"><strong>Budget Details:</strong></p>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0;">${data.budgetDetails}</p>
      ` : ''}
      
      ${data.campaignDetails ? `
      <p style="margin: 16px 0 0;"><strong>Campaign Details:</strong></p>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0;">${data.campaignDetails}</p>
      ` : ''}
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${data.reviewLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Review & Approve Discount
      </a>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ Security Notice:</strong> This link is unique and expires in 24 hours. You will need to verify with an OTP sent to your email before approving.
      </p>
    </div>
    
  </div>
  
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>Moksh Promotion CRM System</p>
    <p>This is an automated email. Please do not reply.</p>
  </div>
  
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Email template for OTP
 */
export function getOTPEmailTemplate(otp: string, leadName: string) {
  const subject = `🔐 Your OTP for Discount Approval: ${otp}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔐 OTP Verification</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    
    <p style="font-size: 16px; margin-bottom: 20px;">Your OTP for approving the discount request for <strong>${leadName}</strong>:</p>
    
    <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; color: #059669; font-family: 'Courier New', monospace;">
        ${otp}
      </div>
    </div>
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ Important:</strong>
      </p>
      <ul style="margin: 8px 0 0; padding-left: 20px; color: #92400e; font-size: 14px;">
        <li>This OTP expires in <strong>10 minutes</strong></li>
        <li>Maximum <strong>5 attempts</strong> allowed</li>
        <li>Do not share this OTP with anyone</li>
      </ul>
    </div>
    
  </div>
  
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>Moksh Promotion CRM System</p>
    <p>This is an automated email. Please do not reply.</p>
  </div>
  
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Email template for Payment Reminder (Client)
 */
export function getClientPaymentReminderTemplate(data: {
  customerName: string;
  invoiceNo?: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: Date;
  salesRepName: string;
  salesRepPhone?: string;
  isOverdue: boolean;
}) {
  const daysOverdue = data.isOverdue
    ? Math.ceil((new Date().getTime() - data.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const subject = data.isOverdue
    ? `⚠️ Payment Overdue: ₹${data.pendingAmount.toLocaleString('en-IN')} - ${data.invoiceNo || 'Invoice'}`
    : `🔔 Payment Reminder: ₹${data.pendingAmount.toLocaleString('en-IN')} - ${data.invoiceNo || 'Invoice'}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: ${data.isOverdue ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${data.isOverdue ? '⚠️ Payment Overdue' : '🔔 Payment Reminder'}</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    
    <p style="font-size: 16px;">Dear ${data.customerName},</p>
    
    <p style="font-size: 16px;">
      ${data.isOverdue
      ? `This is a reminder that your payment is <strong style="color: #dc2626;">overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}</strong>.`
      : 'This is a friendly reminder about your upcoming payment.'
    }
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${data.isOverdue ? '#dc2626' : '#3b82f6'};">
      <h2 style="margin-top: 0; color: ${data.isOverdue ? '#dc2626' : '#3b82f6'}; font-size: 18px;">Payment Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${data.invoiceNo ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Invoice No:</td>
          <td style="padding: 8px 0; text-align: right;">${data.invoiceNo}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Total Amount:</td>
          <td style="padding: 8px 0; text-align: right;">₹${data.totalAmount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Paid Amount:</td>
          <td style="padding: 8px 0; text-align: right; color: #059669;">₹${data.paidAmount.toLocaleString('en-IN')}</td>
        </tr>
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 12px 0; font-weight: 600; font-size: 16px;">Pending Amount:</td>
          <td style="padding: 12px 0; text-align: right; font-size: 20px; font-weight: 700; color: ${data.isOverdue ? '#dc2626' : '#f59e0b'};">₹${data.pendingAmount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Due Date:</td>
          <td style="padding: 8px 0; text-align: right; ${data.isOverdue ? 'color: #dc2626; font-weight: 600;' : ''}">${data.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
      <h2 style="margin-top: 0; color: #8b5cf6; font-size: 18px;">Contact Information</h2>
      <p style="margin: 8px 0;"><strong>Sales Representative:</strong> ${data.salesRepName}</p>
      ${data.salesRepPhone ? `<p style="margin: 8px 0;"><strong>Phone:</strong> ${data.salesRepPhone}</p>` : ''}
    </div>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Please arrange for payment at your earliest convenience. If you have already made the payment, please ignore this reminder.
    </p>
    
    <p style="font-size: 16px;">
      For any queries, please contact ${data.salesRepName}${data.salesRepPhone ? ` at ${data.salesRepPhone}` : ''}.
    </p>
    
  </div>
  
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>Moksh Promotion</p>
    <p>Thank you for your business!</p>
  </div>
  
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Email template for Internal Payment Reminder (Sales/Finance)
 */
export function getInternalPaymentReminderTemplate(data: {
  leadName: string;
  leadPhone: string;
  invoiceNo?: string;
  pendingAmount: number;
  dueDate: Date;
  status: string;
  lastFollowupNote?: string;
  clientCommitmentDate?: Date;
  isOverdue: boolean;
}) {
  const subject = `💼 Payment Follow-up: ${data.leadName} - ₹${data.pendingAmount.toLocaleString('en-IN')}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Internal Payment Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">💼 Payment Follow-up Required</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea; font-size: 18px;">Lead Information</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Customer:</td>
          <td style="padding: 8px 0;">${data.leadName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Phone:</td>
          <td style="padding: 8px 0;">${data.leadPhone}</td>
        </tr>
        ${data.invoiceNo ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Invoice:</td>
          <td style="padding: 8px 0;">${data.invoiceNo}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: ${data.isOverdue ? '#fee2e2' : '#fef3c7'}; color: ${data.isOverdue ? '#dc2626' : '#f59e0b'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${data.status}</span></td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
      <h2 style="margin-top: 0; color: #f59e0b; font-size: 18px;">Payment Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Pending Amount:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 20px; font-weight: 700; color: #dc2626;">₹${data.pendingAmount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Due Date:</td>
          <td style="padding: 8px 0; text-align: right;">${data.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        </tr>
        ${data.clientCommitmentDate ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Client Commitment:</td>
          <td style="padding: 8px 0; text-align: right; color: #8b5cf6; font-weight: 600;">${data.clientCommitmentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    ${data.lastFollowupNote ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
      <h2 style="margin-top: 0; color: #10b981; font-size: 18px;">Last Follow-up Note</h2>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0;">${data.lastFollowupNote}</p>
    </div>
    ` : ''}
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Action Required:</strong> Please follow up with the client regarding this payment.
      </p>
    </div>
    
  </div>
  
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>Moksh Promotion CRM System</p>
    <p>This is an automated reminder.</p>
  </div>
  
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Email template for Discount Inquiry Notification (Admin)
 */
export function getDiscountInquiryAdminEmailTemplate(data: {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  companyName?: string;
  baseTotal: number;
  requestedDiscount?: string;
  notes?: string;
  itemsCount: number;
  otp: string;
  otpExpiresAt: Date;
  approveLink: string;
}) {
  const subject = `🔔 New Discount Inquiry: ₹${data.baseTotal.toLocaleString('en-IN')} by ${data.clientName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Discount Inquiry Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Discount Inquiry</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">

    <p>A new client has requested a discount plan from the cart.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top:0;">Client Details</h3>
        <p><strong>Name:</strong> ${data.clientName}</p>
        <p><strong>Email:</strong> ${data.clientEmail}</p>
        <p><strong>Number:</strong> ${data.clientPhone || 'N/A'}</p>
        <p><strong>Company:</strong> ${data.companyName || 'N/A'}</p>
        <p><strong>Items:</strong> ${data.itemsCount}</p>
        <p><strong>Est. Base Total:</strong> ₹${data.baseTotal.toLocaleString('en-IN')}</p>
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        ${data.requestedDiscount ? `<p><strong>Expected Discount:</strong> ${data.requestedDiscount}</p>` : ''}
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px dashed #4f46e5;">
      <p style="margin:0; text-transform:uppercase; letter-spacing:1px; font-size:12px; color:#6b7280;">OTP for Approval</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 5px; color: #4338ca; margin: 10px 0;">
        ${data.otp}
      </div>
      <p style="font-size:12px; color:#ef4444;">Expires in 10 minutes</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${data.approveLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Review & Approve Now
      </a>
      <p style="font-size: 11px; margin-top: 10px; color: #6b7280;">You will need the OTP above to complete the action.</p>
    </div>
    
  </div>
</body>
</html>
  `;
  return { subject, html };
}

/**
 * Email template for Discount Plan Approved (Client)
 */
export function getDiscountInquiryClientTemplate(data: {
  clientName: string;
  baseTotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
  itemsHtmlTable: string; // pre-rendered simplified table row
}) {
  const subject = `🎉 Your Discounted Campaign Plan is Ready!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Discount Plan Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Good News, ${data.clientName}!</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    
    <p>We are excited to offer you a special discounted rate for your campaign.</p>

    <div style="background: white; padding: 0; border-radius: 8px; overflow:hidden; margin-bottom: 20px;">
        <table style="width:100%; text-align:left; border-collapse:collapse;">
            <thead style="background:#f3f4f6;">
                <tr>
                    <th style="padding:10px;">Item</th>
                    <th style="padding:10px; text-align:right;">Rate</th>
                </tr>
            </thead>
            <tbody>
                ${data.itemsHtmlTable}
            </tbody>
        </table>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
         <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>Base Total:</span>
            <span>₹${data.baseTotal.toLocaleString('en-IN')}</span>
         </div>
         <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#059669;">
            <span>Discount (${data.discountPercent}%):</span>
            <span>- ₹${data.discountAmount.toLocaleString('en-IN')}</span>
         </div>
         <div style="display:flex; justify-content:space-between; margin-top:10px; border-top:1px solid #e5e7eb; pt-2; font-weight:bold; font-size:18px;">
            <span>Final Total:</span>
            <span>₹${data.finalTotal.toLocaleString('en-IN')}</span>
         </div>
    </div>

    <p>To proceed with this plan, please contact our sales team at sales@mokshpromotion.com or reply to this email.</p>
    
  </div>
</body>
</html>
  `;
  return { subject, html };
}

/**
 * Email template for Campaign Plan Proposal (Client) with Detailed Inventory
 */
export function getPlanEmailTemplate(data: {
  clientName: string;
  planId: string;
  items: any[];
  baseTotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  finalTotal: number;
  senderName: string;
  notes?: string;
}) {
  const subject = `📋 Your Campaign Proposal from Moksh Promotion (Plan #${data.planId.slice(-6)})`;

  const itemsHtml = data.items.map((item, index) => `
    <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
      <td style="padding: 6px;">${item.sourceSrNo || index + 1}</td>
      <td style="padding: 6px;">
        <div style="font-weight: 600;">${item.outletName || item.name}</div>
      </td>
      <td style="padding: 6px;">${item.locationName || item.location}</td>
      <td style="padding: 6px;">${item.district}</td>
      <td style="padding: 6px;">${item.state}</td>
      <td style="padding: 6px;">${item.areaType || '-'}</td>
      <td style="padding: 6px; white-space: nowrap;">${item.widthFt || item.width} x ${item.heightFt || item.height}</td>
      <td style="padding: 6px;">${item.areaSqft || item.totalArea}</td>
      <td style="padding: 6px;">₹${Number(item.ratePerSqft || item.rate).toLocaleString('en-IN')}</td>
      <td style="padding: 6px;">₹${Number(item.printingCharge || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 6px; font-weight: 700; text-align: right;">₹${Number(item.netTotal).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Campaign Proposal</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Campaign Proposal</h1>
    <p style="color: #bfdbfe; margin-top: 5px;">Prepared for ${data.clientName}</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
    
    <p>Dear ${data.clientName},</p>
    <p>Please find below the detailed campaign plan as discussed.</p>

    <div style="background: white; border-radius: 8px; overflow-x: auto; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <table style="width:100%; min-width: 900px; text-align:left; border-collapse:collapse;">
        <thead style="background:#f3f4f6;">
          <tr style="font-size: 11px; text-transform:uppercase; color:#6b7280;">
            <th style="padding:8px;">Sr</th>
            <th style="padding:8px;">Outlet</th>
            <th style="padding:8px;">Location</th>
            <th style="padding:8px;">District</th>
            <th style="padding:8px;">State</th>
            <th style="padding:8px;">Type</th>
            <th style="padding:8px;">W x H (ft)</th>
            <th style="padding:8px;">Area (sqft)</th>
            <th style="padding:8px;">Rate</th>
            <th style="padding:8px;">Print Chg</th>
            <th style="padding:8px; text-align:right;">Net Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    ${data.notes ? `
    <div style="background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
      <h4 style="margin:0 0 5px 0; color: #1e40af;">Notes</h4>
      <p style="margin:0; font-size: 14px; color: #1e3a8a;">${data.notes}</p>
    </div>
    ` : ''}

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; max-width: 400px; margin-left: auto;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="color:#6b7280;">Base Total</span>
        <span style="font-weight:600;">₹${data.baseTotal.toLocaleString('en-IN')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:#ef4444;">
        <span>Discount (${data.discountType === 'PERCENT' ? `${data.discountValue}%` : 'Flat'})</span>
        <span>- ₹${data.discountAmount.toLocaleString('en-IN')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:18px; font-weight:700; color:#1d4ed8;">
        <span>Final Total</span>
        <span>₹${data.finalTotal.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      To approve this plan, please reply to this email or contact <strong>${data.senderName}</strong>.
    </p>

  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>Moksh Promotion | Strategic Outdoor Media Solutions</p>
  </div>
  
</body>
</html>
  `;

  return { subject, html };
}

export function getVendorInviteEmailTemplate(data: {
  vendorName: string;
  companyName?: string | null;
  setupLink: string;
  expiresAt: Date;
}) {
  const subject = "Moksh Promotion Vendor Access Invite";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendor Invite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f172a; color: #ffffff; padding: 24px; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">Vendor Access Invite</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; padding: 24px;">
    <p>Hello ${data.vendorName},</p>
    <p>You have been added as a vendor${data.companyName ? ` for <strong>${data.companyName}</strong>` : ""} on Moksh Promotion.</p>
    <p>Use the secure link below to set your password and access the vendor dashboard.</p>
    <p style="margin: 24px 0;">
      <a href="${data.setupLink}" style="background: #1d4ed8; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; display: inline-block; font-weight: 600;">
        Set Password & Login
      </a>
    </p>
    <p style="font-size: 13px; color: #6b7280;">This link expires on ${data.expiresAt.toLocaleString("en-IN")}.</p>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

export function getVendorAssignmentEmailTemplate(data: {
  vendorName: string;
  siteName: string;
  siteCode?: string | null;
  locationLabel?: string | null;
  notes?: string | null;
  dashboardLink: string;
}) {
  const subject = "New Site Assignment for Vendor Upload";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Site Assignment</title></head>
<body style="font-family: Arial, sans-serif; color: #111827; max-width: 640px; margin: 0 auto; padding: 20px;">
  <div style="border:1px solid #e5e7eb; border-radius: 10px; padding: 24px;">
    <h2 style="margin-top: 0;">New Assignment</h2>
    <p>Hello ${data.vendorName},</p>
    <p>A new site has been assigned to you for live proof upload.</p>
    <ul>
      <li><strong>Site:</strong> ${data.siteName}</li>
      <li><strong>Site ID:</strong> ${data.siteCode || "-"}</li>
      <li><strong>Location:</strong> ${data.locationLabel || "-"}</li>
      <li><strong>Notes:</strong> ${data.notes || "-"}</li>
    </ul>
    <p>
      <a href="${data.dashboardLink}" style="background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">
        Open Vendor Dashboard
      </a>
    </p>
  </div>
</body>
</html>
  `;
  return { subject, html };
}

export function getVendorProofRejectedEmailTemplate(data: {
  vendorName: string;
  siteName: string;
  reason?: string | null;
  dashboardLink: string;
}) {
  const subject = "Proof Re-upload Requested";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Proof Rejected</title></head>
<body style="font-family: Arial, sans-serif; color: #111827; max-width: 640px; margin: 0 auto; padding: 20px;">
  <div style="border:1px solid #e5e7eb; border-radius: 10px; padding: 24px;">
    <h2 style="margin-top: 0; color: #b45309;">Re-upload Requested</h2>
    <p>Hello ${data.vendorName},</p>
    <p>Your submitted proof for <strong>${data.siteName}</strong> was not approved.</p>
    <p><strong>Reason:</strong> ${data.reason || "Please upload clearer and valid live proof."}</p>
    <p>
      <a href="${data.dashboardLink}" style="background:#b45309;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">
        Re-upload Proof
      </a>
    </p>
  </div>
</body>
</html>
  `;
  return { subject, html };
}

export function getClientSiteLiveEmailTemplate(data: {
  clientName?: string | null;
  siteName: string;
  siteCode?: string | null;
  locationLabel?: string | null;
  campaignName?: string | null;
  proofLink?: string | null;
}) {
  const subject = "Your hoarding/site is now live";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Site Live</title></head>
<body style="font-family: Arial, sans-serif; color: #111827; max-width: 640px; margin: 0 auto; padding: 20px;">
  <div style="border:1px solid #e5e7eb; border-radius: 10px; padding: 24px;">
    <h2 style="margin-top: 0; color:#047857;">Site is Live</h2>
    <p>Hello ${data.clientName || "Client"},</p>
    <p>Your booked site/hoarding is now live.</p>
    <ul>
      <li><strong>Site:</strong> ${data.siteName}</li>
      <li><strong>Site ID:</strong> ${data.siteCode || "-"}</li>
      <li><strong>Location:</strong> ${data.locationLabel || "-"}</li>
      <li><strong>Campaign:</strong> ${data.campaignName || "-"}</li>
    </ul>
    ${data.proofLink ? `<p><a href="${data.proofLink}" style="color:#1d4ed8;">View approved proof</a></p>` : ""}
    <p>Thank you for choosing Moksh Promotion.</p>
  </div>
</body>
</html>
  `;
  return { subject, html };
}
