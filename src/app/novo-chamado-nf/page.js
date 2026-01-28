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
    forma_pagamento: '', tarefa: '', tarefa_destinatario: '', obs: ''
  })
  
  const [datasParcelas, setDatasParcelas] = useState(['']) 
  const [fileServico, setFileServico] = useState(null)
  const [filePeca, setFilePeca] = useState(null)

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
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${path}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const { error } = await supabase.storage.from('anexos').upload(filePath, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(filePath)
      return publicUrl
    } catch (err) { return null }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const urlS = (tipoNF === 'servico' || tipoNF === 'ambas') ? await uploadFile(fileServico, 'servicos') : null
      const urlP = (tipoNF === 'pecas' || tipoNF === 'ambas') ? await uploadFile(filePeca, 'pecas') : null

      // CORREÇÃO DA DATA: Se a string estiver vazia, enviamos null
      const dataVencimento = datasParcelas[0] && datasParcelas[0] !== "" ? datasParcelas[0] : null

      const { error } = await supabase.from('Chamado_NF').insert([{
        nom_cliente: formData.nom_cliente,
        valor_servico: formData.valor_servico,
        num_nf_servico: formData.num_nf_servico,
        num_nf_peca: formData.num_nf_peca,
        forma_pagamento: formData.forma_pagamento,
        tarefa: formData.tarefa,
        tarefa_destinatario: formData.tarefa_destinatario,
        setor: setor,
        // Inicia na fase do Kanban que você pediu
        status: 'gerar_boleto', 
        anexo_nf_servico: urlS,
        anexo_nf_peca: urlP,
        vencimento_boleto: dataVencimento, 
        obs: datasParcelas.length > 1 ? `Vencimentos: ${datasParcelas.filter(d => d !== "").join(' | ')} - ${formData.obs}` : formData.obs
      }])

      if (!error) {
        alert("Chamado gerado no Fluxo NF!")
        router.push('/')
      } else {
        alert("Erro no banco: " + error.message)
      }
    } catch (err) {
      alert("Erro ao processar: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const glassInput = {
    padding: '14px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.4)', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(15px)', padding: '40px', borderRadius: '45px', width: '100%', maxWidth: '550px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
        
        <h2 style={{ color: '#14532d', fontWeight: '900', textAlign: 'center', marginBottom: '30px', fontSize: '24px' }}>NOVO CHAMADO NF</h2>

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
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '20px' }}>
                  <label style={{fontSize:'10px', fontWeight:'bold'}}>NF SERVIÇO</label>
                  <input type="text" placeholder="Nº NF" required style={glassInput} onChange={(e) => setFormData({...formData, num_nf_servico: e.target.value})} />
                  <input type="file" required style={{ marginTop: '10px', fontSize: '11px' }} onChange={(e) => setFileServico(e.target.files[0])} />
                </div>
              )}
              {(tipoNF === 'pecas' || tipoNF === 'ambas') && (
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '20px' }}>
                  <label style={{fontSize:'10px', fontWeight:'bold'}}>NF PEÇAS</label>
                  <input type="text" placeholder="Nº NF" required style={glassInput} onChange={(e) => setFormData({...formData, num_nf_peca: e.target.value})} />
                  <input type="file" required style={{ marginTop: '10px', fontSize: '11px' }} onChange={(e) => setFilePeca(e.target.files[0])} />
                </div>
              )}
            </div>
          )}

          <input type="text" placeholder="Cliente" required style={glassInput} onChange={(e) => setFormData({...formData, nom_cliente: e.target.value})} />
          <input type="text" placeholder="Valor Total R$" required style={glassInput} onChange={(e) => setFormData({...formData, valor_servico: e.target.value})} />

          <select required style={{...glassInput, fontWeight:'bold', border:'2px solid #22c55e'}} onChange={(e) => setFormData({...formData, tarefa: e.target.value})}>
            <option value="">AÇÃO NECESSÁRIA</option>
            <option value="Gerar Boleto">Gerar Boleto</option>
            <option value="Enviar Boleto">Enviar Boleto</option>
            <option value="Cobrar Novamente Cliente">Cobrar Novamente Cliente</option>
          </select>

          <select required style={glassInput} onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}>
            <option value="">FORMA DE PAGAMENTO</option>
            <option value="Pix">À vista Pix</option>
            <option value="Boleto 30 dias">Boleto 30 dias</option>
            <option value="Boleto Parcelado">Boleto Parcelado</option>
          </select>

          {(formData.forma_pagamento.includes('Boleto')) && (
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '20px' }}>
              <label style={{fontSize:'10px', fontWeight:'bold'}}>VENCIMENTO(S)</label>
              {formData.forma_pagamento === 'Boleto Parcelado' && (
                <select style={{...glassInput, marginBottom:'10px'}} onChange={(e) => setDatasParcelas(new Array(parseInt(e.target.value)).fill(''))}>
                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}x</option>)}
                </select>
              )}
              {datasParcelas.map((_, i) => (
                <input key={i} type="date" required style={{...glassInput, marginBottom:'5px'}} onChange={(e) => {
                  const n = [...datasParcelas]; n[i] = e.target.value; setDatasParcelas(n)
                }} />
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select required style={glassInput} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Setor Destino</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Pós-Vendas">Pós-Vendas</option>
            </select>
            <select required disabled={!setor} style={glassInput} onChange={(e) => setFormData({...formData, tarefa_destinatario: e.target.value})}>
              <option value="">Pessoa</option>
              {usuariosFiltrados.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          <button disabled={loading} style={{ backgroundColor: '#22c55e', color: 'white', padding: '18px', borderRadius: '20px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
            {loading ? 'PROCESSANDO...' : 'CRIAR CHAMADO NO FLUXO'}
          </button>
        </form>
      </div>
    </div>
  )
}