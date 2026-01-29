'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovoChamadoNF() {
  const [todosUsuarios, setTodosUsuarios] = useState([])
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([])
  const [setor, setSetor] = useState('')
  const [tipoNF, setTipoNF] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    nom_cliente: '', valor_servico: '', num_nf_servico: '', num_nf_peca: '',
    forma_pagamento: '', tarefa: '', tarefa_destinatario: '', obs: '',
    qtd_parcelas: 1, data_primeira_parcela: ''
  })
  
  const [fileServico, setFileServico] = useState(null)
  const [filePeca, setFilePeca] = useState(null)
  const [filePix, setFilePix] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('financeiro_usu').select('id, nome, funcao')
      if (data) setTodosUsuarios(data)
    }
    load()
  }, [])

  useEffect(() => {
    setUsuariosFiltrados(todosUsuarios.filter(u => u.funcao === setor))
  }, [setor, todosUsuarios])

  const uploadFile = async (file, path) => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const filePath = `${path}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const { error } = await supabase.storage.from('anexos').upload(filePath, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(filePath)
    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const urlS = (tipoNF === 'servico' || tipoNF === 'ambas') ? await uploadFile(fileServico, 'servicos') : null
      const urlP = (tipoNF === 'pecas' || tipoNF === 'ambas') ? await uploadFile(filePeca, 'pecas') : null
      const urlPix = (formData.forma_pagamento === 'Pix') ? await uploadFile(filePix, 'comprovantes') : null

      const isPix = formData.forma_pagamento === 'Pix';
      const statusInicial = isPix ? 'validar_pix' : 'gerar_boleto';
      const tarefaInicial = isPix ? 'Validar Recebimento Pix' : 'Gerar Boleto';

      const { error } = await supabase.from('Chamado_NF').insert([{
        ...formData,
        setor: setor,
        status: statusInicial,
        tarefa: tarefaInicial,
        anexo_nf_servico: urlS,
        anexo_nf_peca: urlP,
        comprovante_pagamento: urlPix,
        vencimento_boleto: formData.data_primeira_parcela
      }])

      if (!error) {
        alert("Chamado gerado com sucesso!")
        router.push('/')
      } else throw error
    } catch (err) { alert("Erro: " + err.message) } finally { setLoading(false) }
  }

  const glassInput = { padding: '14px', borderRadius: '15px', border: '1px solid #ddd', background: '#fff', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily:'sans-serif', background:'#f8fafc' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '45px', width: '100%', maxWidth: '550px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#14532d', fontWeight: '900', textAlign: 'center', marginBottom: '30px' }}>NOVO FATURAMENTO</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <select required style={glassInput} onChange={(e) => setTipoNF(e.target.value)}>
            <option value="">O QUE ESTÁ LANÇANDO?</option>
            <option value="servico">Nota de Serviço</option>
            <option value="pecas">Nota de Peças</option>
            <option value="ambas">Ambas</option>
          </select>

          {tipoNF && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(tipoNF === 'servico' || tipoNF === 'ambas') && (
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '20px', border:'1px solid #eee' }}>
                  <label style={{fontSize:'10px', fontWeight:'bold'}}>NF SERVIÇO</label>
                  <input type="text" placeholder="Nº NF" required style={glassInput} onChange={(e) => setFormData({...formData, num_nf_servico: e.target.value})} />
                  <input type="file" required style={{ marginTop: '10px', fontSize: '11px' }} onChange={(e) => setFileServico(e.target.files[0])} />
                </div>
              )}
              {(tipoNF === 'pecas' || tipoNF === 'ambas') && (
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '20px', border:'1px solid #eee' }}>
                  <label style={{fontSize:'10px', fontWeight:'bold'}}>NF PEÇAS</label>
                  <input type="text" placeholder="Nº NF" required style={glassInput} onChange={(e) => setFormData({...formData, num_nf_peca: e.target.value})} />
                  <input type="file" required style={{ marginTop: '10px', fontSize: '11px' }} onChange={(e) => setFilePeca(e.target.files[0])} />
                </div>
              )}
            </div>
          )}

          <input type="text" placeholder="Nome do Cliente" required style={glassInput} onChange={(e) => setFormData({...formData, nom_cliente: e.target.value})} />
          <input type="number" placeholder="Valor Total R$" required style={glassInput} onChange={(e) => setFormData({...formData, valor_servico: e.target.value})} />

          <select required style={glassInput} onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}>
            <option value="">FORMA DE PAGAMENTO</option>
            <option value="Pix">À vista Pix</option>
            <option value="Boleto 30 dias">Boleto 30 dias</option>
            <option value="Boleto Parcelado">Boleto Parcelado</option>
          </select>

          {formData.forma_pagamento === 'Pix' && (
            <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px', border:'1px solid #3b82f6' }}>
               <label style={{fontSize:'11px', fontWeight:'bold', color:'#1d4ed8'}}>ANEXAR COMPROVANTE PIX:</label>
               <input type="file" required style={{marginTop:'10px'}} onChange={(e) => setFilePix(e.target.files[0])} />
            </div>
          )}

          {formData.forma_pagamento === 'Boleto Parcelado' && (
             <input type="number" placeholder="Qtd Parcelas" style={glassInput} onChange={(e) => setFormData({...formData, qtd_parcelas: e.target.value})} />
          )}

          {formData.forma_pagamento.includes('Boleto') && (
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '20px' }}>
              <label style={{fontSize:'10px', fontWeight:'bold'}}>DATA DA 1ª PARCELA / VENCIMENTO</label>
              <input type="date" required style={glassInput} onChange={(e) => setFormData({...formData, data_primeira_parcela: e.target.value})} />
            </div>
          )}

          <textarea placeholder="Observações..." style={{...glassInput, height:'80px'}} onChange={(e) => setFormData({...formData, obs: e.target.value})} />

          <select required style={glassInput} onChange={(e) => setSetor(e.target.value)}>
            <option value="">Setor Destino</option>
            <option value="Financeiro">Financeiro</option>
            <option value="Pós-Vendas">Pós-Vendas</option>
          </select>

          <button disabled={loading} style={{ backgroundColor: '#22c55e', color: '#fff', padding: '18px', borderRadius: '20px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
            {loading ? 'GERANDO...' : 'CRIAR CHAMADO NO FLUXO'}
          </button>
        </form>
      </div>
    </div>
  )
}