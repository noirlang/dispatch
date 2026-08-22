class Api::V1::Calendar::EventsController < Api::V1::BaseController
  skip_before_action :authenticate!, only: [:feed]

  # GET /api/v1/calendar/events
  def index
    start_date = params[:start] ? Time.parse(params[:start]) : Time.current.beginning_of_week
    end_date   = params[:end]   ? Time.parse(params[:end])   : start_date + 4.weeks
    events = current_user.calendar_events.where(starts_at: start_date..end_date).order(:starts_at)
    render json: events
  end

  # GET /api/v1/calendar/sync_info
  def sync_info
    token = JwtHelper.encode(user_id: current_user.id)
    domain = ServerConfig.current&.domain || request.host_with_port
    base_url = "#{request.protocol}#{request.host_with_port}"
    feed_url = "#{base_url}/api/v1/calendar/feed.ics?token=#{token}"
    webcal_url = feed_url.sub(/^https?:\/\//, "webcal://")

    render json: {
      user_email: current_user.email,
      feed_url: feed_url,
      webcal_url: webcal_url,
      instructions: {
        iphone: "Ayarlar > Takvim > Hesaplar > Hesap Ekle > Diğer > Abone Olunan Takvim Ekle kısmına Webcal bağlantısını yapıştırın.",
        thunderbird: "Yeni Takvim > Ağ Üzerinde > iCalendar (.ics) seçip Takvim Bağlantısını yapıştırın.",
        google_calendar: "Diğer Takvimler (+) > URL'den Ekle kısmına Takvim Bağlantısını yapıştırın."
      }
    }
  end

  # GET /api/v1/calendar/feed.ics?token=...
  def feed
    token = params[:token]
    payload = JwtHelper.decode(token)
    user = User.find_by(id: payload&.dig("user_id"))

    return head :unauthorized unless user

    events = user.calendar_events.order(:starts_at)
    domain = user.email.split("@").last.presence || "dispatch.local"

    cal = []
    cal << "BEGIN:VCALENDAR"
    cal << "VERSION:2.0"
    cal << "PRODID:-//Dispatch//Dispatch Calendar 1.0//TR"
    cal << "CALSCALE:GREGORIAN"
    cal << "METHOD:PUBLISH"
    cal << "X-WR-CALNAME:Dispatch Takvim (#{user.email})"
    cal << "X-WR-TIMEZONE:UTC"

    events.each do |event|
      cal << "BEGIN:VEVENT"
      cal << "UID:dispatch-evt-#{event.id}-#{event.created_at.to_i}@#{domain}"
      cal << "DTSTAMP:#{Time.current.utc.strftime('%Y%m%dT%H%M%SZ')}"
      if event.all_day
        cal << "DTSTART;VALUE=DATE:#{event.starts_at.strftime('%Y%m%d')}"
        cal << "DTEND;VALUE=DATE:#{(event.ends_at || event.starts_at + 1.day).strftime('%Y%m%d')}"
      else
        cal << "DTSTART:#{event.starts_at.utc.strftime('%Y%m%dT%H%M%SZ')}"
        cal << "DTEND:#{(event.ends_at || event.starts_at + 1.hour).utc.strftime('%Y%m%dT%H%M%SZ')}"
      end
      cal << "SUMMARY:#{event.title.to_s.gsub(/\r?\n/, ' ')}"
      cal << "DESCRIPTION:#{event.description.to_s.gsub(/\r?\n/, '\\n')}" if event.description.present?
      cal << "LOCATION:#{event.location.to_s.gsub(/\r?\n/, ' ')}" if event.location.present?
      cal << "STATUS:CONFIRMED"
      cal << "END:VEVENT"
    end

    cal << "END:VCALENDAR"

    render plain: cal.join("\r\n"), content_type: "text/calendar; charset=utf-8"
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
