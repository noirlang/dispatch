class Api::V1::DashboardController < Api::V1::BaseController
  def index
    cards = current_user.dashboard_cards.active.by_priority
    render json: cards
  end

  def show
    render json: current_user.dashboard_cards.find(params[:id])
  end

  def create
    card = current_user.dashboard_cards.create!(
      card_type: params[:card_type].presence || "general",
      summary: params[:summary].to_s,
      priority: params[:priority].presence || "medium",
      actionable_items: params[:actionable_items] || [],
      tags: params[:tags] || ["pano_notu"]
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
