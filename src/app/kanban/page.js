'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function KanbanPage() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [fileBoleto, setFileBoleto] = useState(null)
  const [obsFinanceiro, setObsFinanceiro] = useState('')
  const router = useRouter()

  const colunas = [
    { id: 'gerar_boleto', titulo: 'Gerar Boleto', cor: '#FEF3C7' },
    { id: 'enviar_cliente', titulo: 'Enviar ao Cliente', cor: '#DBEAFE' },
    { id: 'aguardando_vencimento', titulo: 'Aguardando Venc.', cor: '#F1F5F9' },
    { id: 'vencido', titulo: 'Vencido!', cor: '#FEE2E2' },
    { id: 'pago', titulo: 'Pago ✅', cor: '#DCFCE7' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      const { data: profile } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(profile)

      const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido')
      setChamados(data || [])
      setLoading(false)
    }
    fetchData()
  }, [router])

  // Função de Upload para o Boleto
  const uploadBoleto = async (file) => {
    const fileExt = file.name.split('.').pop()
    const filePath = `boletos/${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('anexos').upload(filePath, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(filePath)
    return publicUrl
  }

  const avancarParaEnvio = async () => {
    if (!fileBoleto) return alert("Anexe o boleto antes de avançar!")
    try {
      const urlBoleto = await uploadBoleto(fileBoleto)
      const { error } = await supabase.from('Chamado_NF').update({ 
        status: 'enviar_cliente',
        tarefa: 'Enviar Para Cliente',
        anexo_boleto: urlBoleto,
        obs: tarefaSelecionada.obs + " | Fin: " + obsFinanceiro
      }).eq('id', tarefaSelecionada.id)
      
      if (!error) window.location.reload()
    } catch (e) { alert(e.message) }
  }

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(15px)',
    borderRadius: '25px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
  }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'900'}}>CARREGANDO FLUXO...</div>

  return (
    <div style={{ padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'white', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>⬅ MINHAS TAREFAS</button>
        <h2 style={{ fontWeight: '900', color: '#14532d' }}>FLUXO NOTA FISCAL</h2>
        <div style={{width:'150px'}}></div>
      </header>

      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '20px' }}>
        {colunas.map(col => (
          <div key={col.id} style={{ minWidth: '260px', flex: 1 }}>
            <div style={{ background: col.cor, padding: '12px', borderRadius: '15px', marginBottom: '15px', textAlign: 'center' }}>
              <span style={{ fontWeight: '900', fontSize: '11px', textTransform: 'uppercase' }}>{col.titulo}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chamados.filter(c => c.status === col.id).map(t => (
                <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ ...glassStyle, padding: '20px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                    {t.num_nf_servico && <span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>S: {t.num_nf_servico}</span>}
                    {t.num_nf_peca && <span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>P: {t.num_nf_peca}</span>}
                  </div>
                  <h3 style={{ margin: 0, fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{t.nom_cliente}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontWeight: '900', color: '#166534', fontSize: '15px' }}>R$ {t.valor_servico}</p>
                    {t.anexo_nf_servico && <span style={{fontSize:'10px'}}>📎</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE INFORMAÇÕES E AÇÕES */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '45px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: '900', color: '#14532d', marginBottom: '20px' }}>DETALHES DO CARD</h3>
            
            {/* Visualização de todas as informações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <p><b>Cliente:</b> {tarefaSelecionada.nom_cliente}</p>
              <p><b>Valor:</b> R$ {tarefaSelecionada.valor_servico}</p>
              <p><b>NF Serviço:</b> {tarefaSelecionada.num_nf_servico || '---'}</p>
              <p><b>NF Peças:</b> {tarefaSelecionada.num_nf_peca || '---'}</p>
              <p><b>Pagamento:</b> {tarefaSelecionada.forma_pagamento}</p>
              <p><b>Observações:</b> {tarefaSelecionada.obs || 'Nenhuma'}</p>

              <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />

              {/* LÓGICA DO FINANCEIRO: GERAR BOLETO */}
              {tarefaSelecionada.status === 'gerar_boleto' && userProfile?.funcao === 'Financeiro' && (
                <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #22c55e' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534' }}>ANEXAR BOLETO GERADO:</label>
                  <input type="file" onChange={(e) => setFileBoleto(e.target.files[0])} style={{ display: 'block', marginTop: '8px', fontSize: '12px' }} />
                  <textarea placeholder="Observações adicionais do financeiro..." rows="2" 
                    style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px' }}
                    onChange={(e) => setObsFinanceiro(e.target.value)}
                  />
                  <button onClick={avancarParaEnvio} style={{ width: '100%', marginTop: '15px', background: '#22c55e', color: 'white', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                    GERAR TAREFA: ENVIAR PARA CLIENTE
                  </button>
                </div>
              )}

              {/* BOTÕES DE ARQUIVOS EXISTENTES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank" style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', textAlign: 'center', fontSize: '11px', textDecoration: 'none', color: '#475569', fontWeight: 'bold' }}>📄 NF SERVIÇO</a>}
                {tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank" style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', textAlign: 'center', fontSize: '11px', textDecoration: 'none', color: '#475569', fontWeight: 'bold' }}>⚙️ NF PEÇAS</a>}
              </div>

              <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>FECHAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}