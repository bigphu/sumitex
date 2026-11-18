/**
 * SumiTeX wording on top of upstream's English strings (frontend/js/i18n.ts
 * adds these after locales/en.json, so the locale files stay as upstream
 * has them). Other languages keep upstream's wording.
 *
 * Phase 5: dashboard tags nest, so they are called folders.
 */
export const englishOverrides: Record<string, string> = {
  about_to_delete_tag:
    'You are about to delete the following folder. The projects in it are not deleted, and the folders inside it move up a level:',
  add_or_remove_project_from_tag:
    'Add or remove project from folder __tagName__',
  add_to_tag: 'Add to folder',
  create_new_tag: 'New folder',
  delete_tag: 'Delete folder',
  edit_tag: 'Edit folder',
  edit_tag_name: 'Edit folder name',
  manage_tag: 'Manage folder',
  new_tag: 'New folder',
  new_tag_name: 'Folder name',
  organize_tags: 'Folders',
  project_categories_tags: 'Project folders',
  select_tag: 'Select folder __tagName__',
  tag_color: 'Folder colour',
  tag_name_cannot_exceed_characters:
    'Folder name cannot exceed __maxLength__ characters',
  tag_name_is_already_used:
    'There is already a folder named "__tagName__" here',
  tags: 'Folders',
  uncategorized: 'Not in a folder',
  your_tags: 'Your folders',
}
