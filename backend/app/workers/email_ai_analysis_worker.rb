class EmailAiAnalysisWorker
  include Sidekiq::Worker
  sidekiq_options queue: :ai, retry: 2

  def perform(email_id)
    email = Email.find_by(id: email_id)
    return unless email
    user = email.user
    return unless user.ai_configured?

    result = Ai::AnalyzeService.call(user, email)
    return unless result.success?

    data = result.data
    user.dashboard_cards.create!(
      email: email,
      card_type: data["type"] || "general",
      summary: data["summary"],
      priority: data["priority"] || "low",
      expires_at: data["expires_at"] ? Time.parse(data["expires_at"]) : nil,
      dismissed: false,
      language: data["language"],
      actionable_items: data["actionable_items"] || [],
      calendar_suggestion: data["calendar_suggestion"],
      tags: data["tags"] || []
    )
  end
end
