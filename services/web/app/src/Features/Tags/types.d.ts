export type Tag = {
  _id: string
  user_id: string
  name: string
  color?: string
  project_ids?: string[]
  parent_id?: string | null // SumiTeX: the folder this one sits in
}
