'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- 1. COMPONENTE DE CHAT POR CARD (INDIVIDUAL) ---
function ChatChamado({ chamadoId, nomCliente, userProfile, onClose }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId) return
    // Escuta apenas mensagens deste card específico
    const channel = supabase.channel(`chat_card_${chamadoId}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'mensagens_chat',
        filter: `chamado_id=eq.${chamadoId}` 
      }, payload => {
        if (String(payload.new.usuario_id) !== String(userProfile.id)) {
          setMensagens(prev => [...prev, payload.new])
        }
      }).subscribe()

    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    const tempMsg = { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }
    setMensagens(prev => [...prev, tempMsg]) // Update otimista

    await supabase.from('mensagens_chat').insert([{ 
      texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId 
    }])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', width: '360px', height: '500px', borderRadius: '30px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px', background: '#22c55e', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
          <b>Chat: {nomCliente}</b>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mensagens.map(m => (
            <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#eee', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : 'black', padding: '10px', borderRadius: '15px', fontSize: '12px', maxWidth: '80%' }}>
              <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
            </div>
          ))}
        </div>
        <form onSubmit={enviar} style={{ padding: '15px', display: 'flex', gap: '5px', borderTop: '1px solid #eee' }}>
          <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Mensagem..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
          <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px' }}>➔</button>
        </form>
      </div>
    </div>
  )
}

// --- 2. PÁGINA PRINCIPAL ---
export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSalvando, setIsSalvando] = useState(false)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [chatAberto, setChatAberto] = useState(null)
  const [notificacaoSino, setNotificacaoSino] = useState(0)

  // Estados do Novo Chamado
  const [isSelecaoOpen, setIsSelecaoOpen] = useState(false) 
  const [showFormNf, setShowFormNf] = useState(false)
  const [tipoFaturamento, setTipoFaturamento] = useState('') // 'os', 'peca', 'ambos'
  const [novoChamado, setNovoChamado] = useState({
    nom_cliente: '', valor_servico: '', forma_pagamento: 'Boleto 30 dias', 
    setor: 'Financeiro', num_nf_peca: '', num_nf_servico: '', obs: '',
    qtd_parcelas: 1, datas_parcelas: []
  })

  const [files, setFiles] = useState({ os: null, peca: null, pix: null })
  const router = useRouter()

  // Carregamento e Realtime Global (Sino)
  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)

      // Sino de Notificação: Escuta qualquer mensagem nova no banco
      supabase.channel('global_chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) {
          setNotificacaoSino(prev => prev + 1)
          new Audio('/notificacao.mp3').play().catch(()=>{})
        }
      }).subscribe()

      fetchTarefas(prof)
    }
    carregar()
  }, [])

  const fetchTarefas = async (prof) => {
    const { data: chamados } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
    const filtradas = (chamados || []).filter(t => {
      if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto' || t.status === 'validar_pix'
      if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
      return false
    })
    setTarefas(filtradas)
    setLoading(false)
  }

  const upload = async (file, folder) => {
    if (!file) return null
    const path = `${folder}/${Date.now()}-${file.name}`
    await supabase.storage.from('anexos').upload(path, file)
    const { data } = supabase.storage.from('anexos').getPublicUrl(path)
    return data.publicUrl
  }

  const salvarChamado = async () => {
    if (!novoChamado.nom_cliente || !novoChamado.valor_servico) return alert("Preencha cliente e valor!")
    setIsSalvando(true)
    try {
      const urlOS = await upload(files.os, 'servicos')
      const urlPeca = await upload(files.peca, 'pecas')
      const urlPix = await upload(files.pix, 'comprovantes')

      let status = 'gerar_boleto', tarefa = 'Gerar Boleto'
      if (novoChamado.forma_pagamento === 'Pix') {
        status = 'validar_pix'; tarefa = 'Validar Recebimento Pix'
      }

      const { error } = await supabase.from('Chamado_NF').insert([{
        ...novoChamado, status, tarefa,
        anexo_nf_servico: urlOS, anexo_nf_peca: urlPeca, comprovante_pagamento: urlPix,
        obs: `${novoChamado.obs} | Parcelas: ${novoChamado.datas_parcelas.join(', ')}`
      }])
      
      if (!error) {
        alert("Sucesso!"); setIsSelecaoOpen(false); setShowFormNf(false); fetchTarefas(userProfile)
      }
    } catch (e) { alert(e.message) }
    finally { setIsSalvando(false) }
  }

  const handleAvanco = async () => {
    setIsSalvando(true)
    let updates = tarefaSelecionada.status === 'validar_pix' 
      ? { status: 'pago', tarefa: 'Pagamento Efetuado' } 
      : { status: 'enviar_cliente', tarefa: 'Enviar para Cliente' }

    await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
    setTarefaSelecionada(null); fetchTarefas(userProfile); setIsSalvando(false)
  }

  const glassStyle = { background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '35px' }

  if (loading) return <div style={{padding:'100px', textAlign:'center'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px 20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER COM SINO */}
      <header style={{ ...glassStyle, padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: '#22c55e', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{userProfile?.nome?.charAt(0)}</div>
          <div>
            <h1 style={{ fontSize: '14px', margin: 0 }}>{userProfile?.nome}</h1>
            <p style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>{userProfile?.funcao?.toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems:'center' }}>
          {/* SINO */}
          <div onClick={() => setNotificacaoSino(0)} style={{ position: 'relative', cursor: 'pointer', fontSize: '20px' }}>
            🔔 {notificacaoSino > 0 && <span style={{ position:'absolute', top:-5, right:-5, background:'red', color:'white', borderRadius:'50%', padding:'2px 6px', fontSize:'10px' }}>{notificacaoSino}</span>}
          </div>
          <button onClick={() => router.push('/kanban')} style={{ background: '#f0fdf4', color: '#166534', padding: '10px 15px', borderRadius: '12px', border: '1px solid #dcfce7', fontWeight: '900', fontSize: '10px' }}>📊 FLUXO NF</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight:'bold' }}>+ NOVO</button>
        </div>
      </header>

      {/* FILA DE CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {tarefas.map(t => (
          <div key={t.id} style={{ ...glassStyle, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div onClick={() => { if(t.status.includes(userProfile.funcao.toLowerCase()) || userProfile.funcao === 'Financeiro') setTarefaSelecionada(t)}} style={{ cursor: 'pointer', flex: 1 }}>
              <span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{t.tarefa.toUpperCase()}</span>
              <h3 style={{ margin: '8px 0 0 0', fontWeight: '800' }}>{t.nom_cliente}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <p style={{ fontWeight: '900', color: '#166534' }}>R$ {t.valor_servico}</p>
              {/* BOTÃO CHAT NO CARD */}
              <button onClick={() => setChatAberto({id: t.id, nome: t.nom_cliente})} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>💬</button>
            </div>
          </div>
        ))}
      </div>

      {/* FORMULÁRIO NF DINÂMICO */}
      {showFormNf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '35px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: '900', color: '#14532d', marginBottom: '20px' }}>Novo Faturamento</h2>
            
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={() => setTipoFaturamento('os')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: tipoFaturamento === 'os' ? '2px solid #22c55e' : '1px solid #ddd' }}>O.S.</button>
              <button onClick={() => setTipoFaturamento('peca')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: tipoFaturamento === 'peca' ? '2px solid #22c55e' : '1px solid #ddd' }}>Peça</button>
              <button onClick={() => setTipoFaturamento('ambos')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: tipoFaturamento === 'ambos' ? '2px solid #22c55e' : '1px solid #ddd' }}>As duas</button>
            </div>

            {/* ANEXOS DINÂMICOS */}
            {(tipoFaturamento === 'os' || tipoFaturamento === 'ambos') && <div style={{marginBottom:10}}><label style={{fontSize:10, fontWeight:'bold'}}>ANEXAR O.S:</label><input type="file" onChange={e => setFiles({...files, os: e.target.files[0]})}/></div>}
            {(tipoFaturamento === 'peca' || tipoFaturamento === 'ambos') && <div style={{marginBottom:10}}><label style={{fontSize:10, fontWeight:'bold'}}>ANEXAR PEÇA:</label><input type="file" onChange={e => setFiles({...files, peca: e.target.files[0]})}/></div>}

            <input placeholder="Cliente" style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' }} onChange={e => setNovoChamado({...novoChamado, nom_cliente: e.target.value})} />
            <input placeholder="Valor Total" type="number" style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' }} onChange={e => setNovoChamado({...novoChamado, valor_servico: e.target.value})} />

            <label style={{fontSize:10, fontWeight:'bold'}}>FORMA DE PAGAMENTO:</label>
            <select style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ddd' }} onChange={e => setNovoChamado({...novoChamado, forma_pagamento: e.target.value})}>
              <option>Boleto 30 dias</option>
              <option>Boleto Parcelado</option>
              <option>Cartão Parcelado</option>
              <option>Cartão a vista</option>
              <option>Pix</option>
            </select>

            {/* PARCELAMENTO DINÂMICO */}
            {novoChamado.forma_pagamento === 'Boleto Parcelado' && (
              <div style={{background:'#f9f9f9', padding:10, borderRadius:10, marginBottom:10}}>
                <input placeholder="Qtd Parcelas" type="number" onChange={e => setNovoChamado({...novoChamado, qtd_parcelas: e.target.value})} style={{width:'100%', padding:10, marginBottom:10}}/>
                {[...Array(Number(novoChamado.qtd_parcelas || 0))].map((_, i) => (
                  <input key={i} type="date" style={{width:'100%', marginBottom:5, padding:5}} onChange={e => {
                    const d = [...novoChamado.datas_parcelas]; d[i] = e.target.value; setNovoChamado({...novoChamado, datas_parcelas: d})
                  }}/>
                ))}
              </div>
            )}

            {novoChamado.forma_pagamento === 'Pix' && (
              <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '15px', marginBottom: 15, border:'1px solid #22c55e' }}>
                <label style={{fontSize:10, fontWeight:'bold'}}>ANEXAR COMPROVANTE PIX:</label>
                <input type="file" onChange={e => setFiles({...files, pix: e.target.files[0]})} />
              </div>
            )}

            <button onClick={salvandoChamado} disabled={isSalvando} style={{ width: '100%', background: '#22c55e', color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 'bold', border: 'none' }}>{isSalvando ? 'PROCESSANDO...' : 'ABRIR CHAMADO'}</button>
            <button onClick={() => setShowFormNf(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#999', marginTop: 10 }}>CANCELAR</button>
          </div>
        </div>
      )}

      {/* CHAT INDIVIDUAL */}
      {chatAberto && <ChatChamado chamadoId={chatAberto.id} nomCliente={chatAberto.nome} userProfile={userProfile} onClose={() => setChatAberto(null)} />}

      {/* MODAL DETALHE PIX (Financeiro) */}
      {tarefaSelecionada?.status === 'validar_pix' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '40px', textAlign: 'center' }}>
            <h3>Validar Recebimento PIX</h3>
            <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" style={{ background:'#f0fdf4', color: '#22c55e', display: 'block', margin: '20px 0', padding:10, borderRadius:10, textDecoration:'none', fontWeight:'bold' }}>👁 VER COMPROVANTE</a>
            <button onClick={handleAvanco} style={{ background: '#22c55e', color: 'white', padding: '15px 30px', borderRadius: '15px', border: 'none', fontWeight: 'bold' }}>MUDAR PARA FASE PAGAMENTO EFETUADO</button>
            <button onClick={() => setTarefaSelecionada(null)} style={{display:'block', width:'100%', marginTop:10, border:'none', background:'none', color:'#999'}}>FECHAR</button>
          </div>
        </div>
      )}

      {/* SELEÇÃO INICIAL + NOVO */}
      {isSelecaoOpen && !showFormNf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '40px', textAlign: 'center' }}>
            <h3 style={{fontWeight:900, marginBottom:20}}>O que deseja abrir?</h3>
            <button onClick={() => setShowFormNf(true)} style={{ width: '100%', padding: '20px', background: '#22c55e', color: 'white', borderRadius: '15px', border: 'none', marginBottom: 10, fontWeight:'bold' }}>NOTA FISCAL / FATURAMENTO</button>
            <button onClick={() => setIsSelecaoOpen(false)} style={{ background: 'none', border: 'none', color: '#999' }}>CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  )
}