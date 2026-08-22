class Api::V1::DashboardController < Api::V1::BaseController
  def index
    cards = current_user.dashboard_cards.active.by_priority
    render json: cards
  end

  def show
    render json: current_user.dashboard_cards.find(params[:id])
  end

  def create
    # H3 Fix: Whitelist card_type and priority — never accept arbitrary user values
    allowed_types = Ai::AnalyzeService::ALLOWED_TYPES
    allowed_priorities = Ai::AnalyzeService::ALLOWED_PRIORITIES

    raw_type     = params[:card_type].to_s.downcase.strip
    raw_priority = params[:priority].to_s.downcase.strip

    card_type = allowed_types.include?(raw_type) ? raw_type : "general"
    priority  = allowed_priorities.include?(raw_priority) ? raw_priority : "medium"

    # Sanitize free-text summary
    safe_summary = ActionController::Base.helpers.strip_tags(params[:summary].to_s).first(500)

    card = current_user.dashboard_cards.create!(
      card_type:        card_type,
      summary:          safe_summary,
      priority:         priority,
      actionable_items: [],   # Never accept raw actionable_items from user
      tags:             ["pano_notu"]
    )
    render json: card, status: :created
  end

  def destroy
    current_user.dashboard_cards.find(params[:id]).update!(dismissed: true)
    render json: { message: "Dismissed" }
  end

  def add_to_calendar
    card = current_user.dashboard_cards.find(params[:id])
    suggestion = card.calendar_suggestion
    return render json: { error: "No calendar suggestion" }, status: :bad_request unless suggestion

    start_time = begin
      Time.parse("#{suggestion["date"]} #{suggestion["time"] || "00:00"}")
    rescue
      Time.current
    end

    event = current_user.calendar_events.find_or_create_by!(
      title: suggestion["title"],
      starts_at: start_time
    ) do |ev|
      ev.description = suggestion["description"]
      ev.all_day = suggestion["all_day"] || false
      ev.source = "ai_extracted"
      ev.email_id = card.email_id
    end

    # Remove card from active dashboard immediately
    card.update!(dismissed: true)

    render json: { event: event, dismissed: true, card_id: card.id }, status: :created
  end
end
