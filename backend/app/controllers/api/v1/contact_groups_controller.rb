class Api::V1::ContactGroupsController < Api::V1::BaseController
  before_action :set_group, only: [:show, :update, :destroy]

  def index
    groups = current_user.contact_groups.order(created_at: :desc)
    render json: groups.map { |g| group_json(g) }
  end

  def show
    render json: group_json(@group)
  end

  def create
    group = current_user.contact_groups.build(group_params)
    if group.save
      render json: group_json(group), status: :created
    else
      render json: { errors: group.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @group.update(group_params)
      render json: group_json(@group)
    else
      render json: { errors: @group.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @group.destroy
    render json: { message: "Grup silindi" }
  end

  private

  def set_group
    @group = current_user.contact_groups.find(params[:id])
  end

  def group_params
    params.permit(:name, :description, :color, members: [])
  end

  def group_json(group)
    {
      id: group.id,
      name: group.name,
      alias: "@#{group.name}",
      description: group.description,
      color: group.color,
      members: group.member_list,
      member_count: group.member_list.size,
      created_at: group.created_at
    }
  end
end
