class Api::V1::Calendar::EventsController < Api::V1::BaseController
  def index
    start_date = params[:start] ? Time.parse(params[:start]) : Time.current.beginning_of_week
    end_date   = params[:end]   ? Time.parse(params[:end])   : start_date + 4.weeks
    events = current_user.calendar_events.where(starts_at: start_date..end_date).order(:starts_at)
    render json: events
  end

  def create
    event = current_user.calendar_events.build(event_params)
    event.source ||= "manual"
    if event.save
      render json: event, status: :created
    else
      render json: { errors: event.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    event = current_user.calendar_events.find(params[:id])
    event.update!(event_params)
    render json: event
  end

  def destroy
    current_user.calendar_events.find(params[:id]).destroy
    render json: { message: "Deleted" }
  end

  private

  def event_params
    params.permit(:title, :description, :location, :starts_at, :ends_at, :all_day, :color)
  end
end
