// Funcions de validació i sanitització

export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input) return ''
  return input.trim().slice(0, maxLength)
}

export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  if (!nickname || nickname.trim().length < 3) {
    return { valid: false, error: 'El nickname ha de tenir almenys 3 caràcters' }
  }
  if (nickname.length > 20) {
    return { valid: false, error: 'El nickname no pot tenir més de 20 caràcters' }
  }
  // Només permetre lletres, números, guions i guions baixos
  if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
    return { valid: false, error: 'El nickname només pot contenir lletres, números, guions i guions baixos' }
  }
  return { valid: true }
}

export function validateProductName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length < 3) {
    return { valid: false, error: 'El nom del producte ha de tenir almenys 3 caràcters' }
  }
  if (name.length > 100) {
    return { valid: false, error: 'El nom del producte no pot tenir més de 100 caràcters' }
  }
  return { valid: true }
}

export function validateDescription(description: string | null): { valid: boolean; error?: string } {
  if (!description) return { valid: true }
  if (description.length > 2000) {
    return { valid: false, error: 'La descripció no pot tenir més de 2000 caràcters' }
  }
  return { valid: true }
}

export function validateMessage(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'El missatge no pot estar buit' }
  }
  if (content.length > 1000) {
    return { valid: false, error: 'El missatge no pot tenir més de 1000 caràcters' }
  }
  return { valid: true }
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Només es permeten imatges JPG, PNG o WEBP' }
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'La imatge no pot ser més gran de 5MB' }
  }
  
  return { valid: true }
}

export function validateUuid(value: string, fieldLabel: string): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: `${fieldLabel} és obligatori` }
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    return { valid: false, error: `${fieldLabel} no és vàlid` }
  }
  return { valid: true }
}

