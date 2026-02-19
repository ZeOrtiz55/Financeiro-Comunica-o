export const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null' || String(dataStr).trim() === '' || dataStr === 'N/A') return 'N/A'
  try {
    const apenasData = String(dataStr).split(' ')[0]
    // If already in dd/mm/yyyy
    if (apenasData.includes('/') && apenasData.split('/')[0].length <= 2) return apenasData
    const partes = apenasData.split(/[-/]/)
    if (partes.length === 3) {
      if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`
      return `${partes[0]}/${partes[1]}/${partes[2]}`
    }
    return dataStr
  } catch (e) { return String(dataStr) }
}

export const formatarMoeda = (valor) => {
  if (valor === null || valor === undefined) return 'R$ 0,00'
  const num = typeof valor === 'string' ? parseFloat(valor) : valor
  if (isNaN(num)) return 'R$ 0,00'
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
