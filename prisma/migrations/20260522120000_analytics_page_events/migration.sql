-- Storefront analytics for admin reports (impressions + daily unique visits per path).
CREATE TABLE "analytics_page_impressions" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_page_impressions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_page_visits" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "visit_day" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_page_visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_page_impressions_created_at_idx" ON "analytics_page_impressions"("created_at");
CREATE INDEX "analytics_page_impressions_path_created_at_idx" ON "analytics_page_impressions"("path", "created_at");

CREATE UNIQUE INDEX "analytics_page_visits_session_key_path_visit_day_key" ON "analytics_page_visits"("session_key", "path", "visit_day");
CREATE INDEX "analytics_page_visits_visit_day_idx" ON "analytics_page_visits"("visit_day");
CREATE INDEX "analytics_page_visits_path_visit_day_idx" ON "analytics_page_visits"("path", "visit_day");
