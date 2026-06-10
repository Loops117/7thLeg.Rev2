-- AlterTable
ALTER TABLE "site_config"
ADD COLUMN "order_confirmation_email_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "order_confirmation_email_subject" TEXT NOT NULL DEFAULT 'Order confirmed — {{companyName}}',
ADD COLUMN "order_confirmation_email_body" TEXT NOT NULL DEFAULT 'Hi {{customerName}},

Thanks for your order! We''ve received your payment.

Order {{orderShortId}}
{{orderItems}}

Total: {{orderTotal}}

View your order: {{orderUrl}}

— {{companyName}}',
ADD COLUMN "order_shipped_email_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "order_shipped_email_subject" TEXT NOT NULL DEFAULT 'Your order is on its way — {{companyName}}',
ADD COLUMN "order_shipped_email_body" TEXT NOT NULL DEFAULT 'Hi {{customerName}},

Good news — your order {{orderShortId}} has shipped!

{{orderItems}}

{{trackingLine}}

View your order: {{orderUrl}}

— {{companyName}}';

-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "order_confirmation_email_sent_at" TIMESTAMP(3),
ADD COLUMN "order_shipped_email_sent_at" TIMESTAMP(3);
