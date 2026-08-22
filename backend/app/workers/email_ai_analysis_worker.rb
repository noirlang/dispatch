class EmailAiAnalysisWorker
  include Sidekiq::Worker
  sidekiq_options queue: :ai, retry: 2

  # Types that should auto-create calendar events
  AUTO_CALENDAR_TYPES = %w[travel meeting ticket].freeze

  def perform(email_id)
    email = Email.find_by(id: email_id)
    return unless email
    user = email.user
    return unless user.ai_configured?

    result = Ai::AnalyzeService.call(user, email)
    return unless result.success?

    data = result.data

    # Create dashboard card
    card = user.dashboard_cards.create!(
      email:             email,
      card_type:         data["type"] || "general",
      summary:           data["summary"],
      priority:          data["priority"] || "low",
      expires_at:        data["expires_at"] ? Time.parse(data["expires_at"]) : nil,
      dismissed:         false,
      language:          data["language"],
      actionable_items:  data["actionable_items"] || [],
      calendar_suggestion: data["calendar_suggestion"],
      tags:              data["tags"] || []
    )

    # Auto-add calendar event for travel, meetings, tickets
    if data["calendar_suggestion"].present? && AUTO_CALENDAR_TYPES.include?(data["type"])
      auto_create_calendar_event(user, email, data["calendar_suggestion"])
    end
  end

  private

  def auto_create_calendar_event(user, email, suggestion)
    return if suggestion["date"].blank?

    starts_at = parse_datetime(suggestion["date"], suggestion["time"])
    return unless starts_at

    # Avoid duplicate events (same title + same day)
    existing = user.calendar_events.where(
      title:     suggestion["title"],
      starts_at: starts_at.beginning_of_day..starts_at.end_of_day
    )
    return if existing.exists?

    user.calendar_events.create!(
      title:       suggestion["title"],
      description: suggestion["description"],
      starts_at:   starts_at,
      all_day:     suggestion["all_day"] || false,
      source:      "ai_extracted",
      email:       email,
      color:       color_for_type(email)
    )
  rescue => e
    Rails.logger.warn "Auto calendar event failed: #{e.message}"
  end

  def parse_datetime(date_str, time_str)
    time_str = time_str.present? ? time_str : "00:00"
    Time.parse("#{date_str} #{time_str}")
  rescue
    nil
  end

  def color_for_type(email)
    card = email.user.dashboard_cards.find_by(email: email)
    case card&.card_type
    when "travel"  then "#ffaa00"
    when "meeting" then "#44ff88"
    when "ticket"  then "#6688ff"
    else "#ffffff40"
    end
  end
end
