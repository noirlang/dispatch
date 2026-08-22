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

    event = current_user.calendar_events.create!(
      title: suggestion["title"],
      description: suggestion["description"],
      starts_at: Time.parse("#{suggestion["date"]} #{suggestion["time"] || "00:00"}"),
      all_day: suggestion["all_day"] || false,
      source: "manual",
      email_id: card.email_id
    )
    render json: event, status: :created
  end
end
