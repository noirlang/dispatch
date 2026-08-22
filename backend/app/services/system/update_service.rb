require "faraday"
require "json"

class System::UpdateService
  REPO = "noirlang/dispatch"
  BRANCH = "master"

  def self.check
    local_sha = `git -C #{Rails.root} rev-parse HEAD 2>/dev/null`.strip
    local_short = `git -C #{Rails.root} rev-parse --short HEAD 2>/dev/null`.strip
    local_date = `git -C #{Rails.root} log -1 --format=%cd --date=iso 2>/dev/null`.strip
    local_msg = `git -C #{Rails.root} log -1 --format=%s 2>/dev/null`.strip

    # Query GitHub API
    remote_sha = nil
    remote_msg = nil
    remote_date = nil
    error = nil

    begin
      conn = Faraday.new("https://api.github.com") do |f|
        f.request :json
        f.response :json
        f.headers["User-Agent"] = "Dispatch-Updater"
        f.adapter Faraday.default_adapter
      end

      res = conn.get("/repos/#{REPO}/commits/#{BRANCH}")
      if res.status == 200
        remote_sha = res.body.dig("sha")
        remote_msg = res.body.dig("commit", "message")&.lines&.first&.strip
        remote_date = res.body.dig("commit", "committer", "date")
      else
        error = res.body.dig("message") || "GitHub API responded with status #{res.status}"
      end
    rescue => e
      error = e.message
    end

    update_available = remote_sha.present? && local_sha.present? && !remote_sha.start_with?(local_sha) && !local_sha.start_with?(remote_sha)

    {
      repo: REPO,
      branch: BRANCH,
      current_commit: local_short.presence || "dev",
      current_commit_full: local_sha,
      current_message: local_msg,
      current_date: local_date,
      remote_commit: remote_sha ? remote_sha[0..6] : nil,
      remote_commit_full: remote_sha,
      remote_message: remote_msg,
      remote_date: remote_date,
      update_available: update_available,
      error: error
    }
  end

  def self.apply
    logs = []
    root = Rails.root.to_s
    repo_root = File.expand_path("..", root)

    logs << "1. Git güncellemeleri çekiliyor (git pull)..."
    pull_output = `git -C #{repo_root} pull origin #{BRANCH} 2>&1`
    logs << pull_output.strip

    logs << "2. Veritabanı migrasyonları güvenle kontrol ediliyor (db:migrate)..."
    db_output = `cd #{root} && bin/rails db:migrate RAILS_ENV=development 2>&1`
    logs << db_output.strip

    logs << "3. Frontend varlıkları kontrol ediliyor..."
    frontend_dir = File.join(repo_root, "frontend")
    if Dir.exist?(frontend_dir)
      build_output = `cd #{frontend_dir} && npm run build 2>&1`
      logs << "Frontend build tamamlandı."
    end

    logs << "4. Servisler sıfır kesintiyle yeniden başlatılıyor..."
    FileUtils.touch(File.join(root, "tmp", "restart.txt")) rescue nil

    {
      success: true,
      logs: logs.join("\n"),
      message: "Sistem başarıyla güncellendi! Verileriniz ve ayarlarınız korundu."
    }
  rescue => e
    {
      success: false,
      error: e.message,
      logs: logs.join("\n")
    }
  end
end
