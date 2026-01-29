'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT CONTEXTUAL (ABRE POR CARD) ---
function ChatChamado({ chamadoId, nomCliente, userProfile, onClose }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId) return
    const channel = supabase
      .channel(`chat_${chamadoId}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'mensagens_chat',
        filter: `chamado_id=eq.${chamadoId}` 
      }, payload => {
        setMensagens(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      }).subscribe()

    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    return () => { supabase.removeChannel(channel) }
  }, [chamadoId])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    await supabase.from('mensagens_chat').insert([{ 
      texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId 
    }])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', width: '360px', height: '550px', borderRadius: '30px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px', background: '#22c55e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b style={{display:'block', fontSize:'14px'}}>Chat: {nomCliente}</b>
            <span style={{fontSize:'10px'}}>ID #{chamadoId}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', color: 'white', borderRadius:'50%', width:'30px', height:'30px', cursor: 'pointer' }}>✕</button>
        </div>
        <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background:'#f8f9fa' }}>
          {mensagens.map(m => (
            <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : '#333', padding: '10px 14px', borderRadius: '15px', fontSize: '13px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', maxWidth: '85%' }}>
              <b style={{ fontSize: '9px', display: 'block', marginBottom:'2px', opacity: 0.7 }}>{m.usuario_nome}</b>{m.texto}
            </div>
          ))}
        </div>
        <form onSubmit={enviar} style={{ padding: '15px', display: 'flex', gap: '8px', background: 'white', borderTop: '1px solid #eee' }}>
          <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Digite sua mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', outline:'none' }} />
          <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', width:'45px', cursor:'pointer' }}>➔</button>
        </form>
      </div>
    </div>
  )
}

// --- PÁGINA PRINCIPAL ---
export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSalvando, setIsSalvando] = useState(false)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [chatAberto, setChatAberto] = useState(null) // {id, nome}
  const [notificacaoGlobal, setNotificacaoGlobal] = useState(0)

  // Estados do Formulário NF (Informações completas restauradas)
  const [isSelecaoOpen, setIsSelecaoOpen] = useState(false)
  const [showFormNf, setShowFormNf] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState('') // 'os', 'peca', 'ambos'
  const [novoChamado, setNovoChamado] = useState({
    nom_cliente: '', valor_servico: '', forma_pagamento: 'Boleto 30 dias', 
    setor: 'Financeiro', num_nf_peca: '', num_nf_servico: '', obs: '',
    qtd_parcelas: 1, datas_parcelas: []
  })

  // Arquivos do Formulário
  const [fileOS, setFileOS] = useState(null)
  const [filePeca, setFilePeca] = useState(null)
  const [filePix, setFilePix] = useState(null)

  const router = useRouter()

  // 1. Carregar Dados e Notificações Globais
  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      
      // Escutar notificações globais de chat (Sino)
      supabase.channel('global_notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) {
          setNotificacaoGlobal(prev => prev + 1)
          new Audio('/notificacao.mp3').play().catch(()=>{})
        }
      }).subscribe()

      carregarTarefas(prof)
    }
    carregar()
  }, [])

  const carregarTarefas = async (prof) => {
    const { data: chamados } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
    const filtradas = (chamados || []).filter(t => {
      if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto' || t.status === 'validar_pix'
      if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
      return false
    })
    setTarefas(filtradas)
    setLoading(false)
  }

  // 2. Upload e Salvar (Com a lógica de PIX e Parcelamento)
  const upload = async (file, folder) => {
    if (!file) return null
    const path = `${folder}/${Date.now()}-${file.name}`
    await supabase.storage.from('anexos').upload(path, file)
    const { data } = supabase.storage.from('anexos').getPublicUrl(path)
    return data.publicUrl
  }

  const salvarNovoChamado = async () => {
    if (!novoChamado.nom_cliente || !novoChamado.valor_servico || !tipoDocumento) return alert("Preencha os campos obrigatórios!")
    setIsSalvando(true)
    try {
      const urlOS = await upload(fileOS, 'servicos')
      const urlPeca = await upload(filePeca, 'pecas')
      const urlPix = await upload(filePix, 'comprovantes')

      let statusInicial = 'gerar_boleto'
      let tarefaInicial = 'Gerar Boleto'
      
      // Fluxo especial PIX: Pula para o financeiro validar
      if (novoChamado.forma_pagamento === 'Pix') {
        statusInicial = 'validar_pix'
        tarefaInicial = 'Validar Recebimento Pix'
      }

      const { error } = await supabase.from('Chamado_NF').insert([{
        ...novoChamado,
        status: statusInicial,
        tarefa: tarefaInicial,
        anexo_nf_servico: urlOS,
        anexo_nf_peca: urlPeca,
        comprovante_pagamento: urlPix,
        obs: `${novoChamado.obs} | Parcelas: ${novoChamado.datas_parcelas.join(' / ')}`
      }])
      
      if (error) throw error
      alert("Chamado Aberto com Sucesso!")
      setIsSelecaoOpen(false); setShowFormNf(false); carregarTarefas(userProfile)
    } catch (e) { alert(e.message) }
    finally { setIsSalvando(false) }
  }

  const handleAvanco = async () => {
    setIsSalvando(true)
    let updates = {}
    if (tarefaSelecionada.status === 'validar_pix') {
      updates = { status: 'pago', tarefa: 'Pagamento Efetuado (PIX)' }
    } else if (tarefaSelecionada.status === 'gerar_boleto') {
      updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente' }
    }
    // ... outras lógicas de avanço
    await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
    setTarefaSelecionada(null); carregarTarefas(userProfile); setIsSalvando(false)
  }

  const glassStyle = { background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '35px' }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando sistema...</div>

  return (
    <div style={{ padding: '30px 20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER COM SINO E NOTIFICAÇÃO GLOBAL */}
      <header style={{ ...glassStyle, padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: '#22c55e', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{userProfile?.nome?.charAt(0)}</div>
          <div>
            <h1 style={{ fontSize: '14px', margin: 0 }}>{userProfile?.nome}</h1>
            <p style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>{userProfile?.funcao?.toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          
          {/* SINO DE NOTIFICAÇÃO */}
          <div onClick={() => setNotificacaoGlobal(0)} style={{ position: 'relative', fontSize: '22px', cursor: 'pointer', background: '#fff', padding: '8px', borderRadius: '12px', boxShadow: '0 5px 10px rgba(0,0,0,0.05)' }}>
            🔔
            {notificacaoGlobal > 0 && (
              <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontWeight: 'bold' }}>{notificacaoGlobal}</div>
            )}
          </div>

          <button onClick={() => router.push('/kanban')} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', padding: '12px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', cursor:'pointer' }}>📊 FLUXO NF</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', padding: '12px 25px', borderRadius: '12px', border: 'none', fontWeight:'bold', cursor:'pointer' }}>+ NOVO</button>
        </div>
      </header>

      {/* LISTA DE CARDS (COM ÍCONE DE MENSAGEM) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#14532d' }}>Sua Fila de Trabalho</h2>
        {tarefas.map(t => (
          <div key={t.id} style={{ ...glassStyle, padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position:'relative' }}>
            <div onClick={() => setTarefaSelecionada(t)} style={{ cursor: 'pointer', flex: 1 }}>
              <span style={{ fontSize: '8px', fontWeight: '900', color: t.status === 'validar_pix' ? '#1d4ed8' : '#166534', background: t.status === 'validar_pix' ? '#dbeafe' : 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{t.tarefa.toUpperCase()}</span>
              <h3 style={{ margin: '10px 0 0 0', fontWeight: '800' }}>{t.nom_cliente}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
               <p style={{ fontWeight: '900', fontSize: '18px', color: '#166534' }}>R$ {t.valor_servico}</p>
               {/* ÍCONE DE MENSAGEM NO CARD */}
               <button onClick={() => setChatAberto({id: t.id, nome: t.nom_cliente})} style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '20px' }}>💬</button>
            </div>
          </div>
        ))}
      </div>

      {/* FORMULÁRIO NF COMPLETO (RESTAURADO) */}
      {showFormNf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '40px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontWeight: '900', color: '#14532d', marginBottom: '25px' }}>Novo Faturamento</h2>
            
            {/* TIPO DE DOCUMENTO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>O QUE ESTÁ SENDO FATURADO?</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                {['os', 'peca', 'ambos'].map(tipo => (
                  <button key={tipo} onClick={() => setTipoDocumento(tipo)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: tipoDocumento === tipo ? '2px solid #22c55e' : '1px solid #ddd', background: tipoDocumento === tipo ? '#f0fdf4' : 'white', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                    {tipo === 'os' ? 'Ordem Serviço' : tipo === 'peca' ? 'Peças' : 'As duas'}
                  </button>
                ))}
              </div>
            </div>

            {/* ANEXOS DINÂMICOS */}
            {(tipoDocumento === 'os' || tipoDocumento === 'ambos') && (
              <div style={{ marginBottom: '15px', background: '#f8fafc', padding: '15px', borderRadius: '15px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>ANEXAR O.S. (Obrigatório):</label>
                <input type="file" style={{ marginTop: '5px' }} onChange={e => setFileOS(e.target.files[0])} />
              </div>
            )}
            {(tipoDocumento === 'peca' || tipoDocumento === 'ambos') && (
              <div style={{ marginBottom: '15px', background: '#f8fafc', padding: '15px', borderRadius: '15px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>ANEXAR NOTA DE PEÇAS (Obrigatório):</label>
                <input type="file" style={{ marginTop: '5px' }} onChange={e => setFilePeca(e.target.files[0])} />
              </div>
            )}

            {/* DADOS DO CLIENTE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              <input placeholder="Nome Completo do Cliente" style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd' }} onChange={e => setNovoChamado({...novoChamado, nom_cliente: e.target.value})} />
              <input placeholder="Valor Total do Faturamento R$" type="number" style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd' }} onChange={e => setNovoChamado({...novoChamado, valor_servico: e.target.value})} />
            </div>

            {/* FORMA DE PAGAMENTO */}
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>MÉTODO DE PAGAMENTO ESCOLHIDO:</label>
            <select style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginTop: '8px', marginBottom: '20px' }} onChange={e => setNovoChamado({...novoChamado, forma_pagamento: e.target.value})}>
              <option>Boleto 30 dias</option>
              <option>Boleto Parcelado</option>
              <option>Cartão Parcelado</option>
              <option>Cartão a vista</option>
              <option>Pix</option>
            </select>

            {/* LOGICA DE PARCELAMENTO/PIX */}
            {novoChamado.forma_pagamento === 'Boleto Parcelado' && (
              <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>QUANTIDADE DE PARCELAS:</label>
                <input type="number" style={{ width: '100%', padding: '10px', marginBottom: '15px' }} onChange={e => setNovoChamado({...novoChamado, qtd_parcelas: e.target.value})} />
                {[...Array(Number(novoChamado.qtd_parcelas || 0))].map((_, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px' }}>Vencimento Parcela {i + 1}:</label>
                    <input type="date" style={{ width: '100%', padding: '8px' }} onChange={e => {
                      const d = [...novoChamado.datas_parcelas]; d[i] = e.target.value; setNovoChamado({...novoChamado, datas_parcelas: d})
                    }} />
                  </div>
                ))}
              </div>
            )}

            {novoChamado.forma_pagamento === 'Pix' && (
              <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #3b82f6' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8' }}>ANEXAR COMPROVANTE PIX (Obrigatório):</label>
                <input type="file" style={{ marginTop: '10px' }} onChange={e => setFilePix(e.target.files[0])} />
              </div>
            )}

            {/* DATA ÚNICA (Boleto 30 ou Cartão) */}
            {(novoChamado.forma_pagamento === 'Boleto 30 dias' || novoChamado.forma_pagamento === 'Cartão a vista') && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>DATA DE VENCIMENTO:</label>
                <input type="date" style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginTop: '8px' }} onChange={e => setNovoChamado({...novoChamado, datas_parcelas: [e.target.value]})} />
              </div>
            )}

            <button onClick={salvarNovoChamado} disabled={isSalvando} style={{ width: '100%', background: '#22c55e', color: 'white', padding: '20px', borderRadius: '18px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
              {isSalvando ? 'PROCESSANDO...' : 'CRIAR CHAMADO ⮕'}
            </button>
            <button onClick={() => setShowFormNf(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#999', marginTop: '15px', cursor: 'pointer' }}>CANCELAR</button>
          </div>
        </div>
      )}

      {/* COMPONENTES DE SUPORTE (CHAT E MODAIS) */}
      {chatAberto && <ChatChamado chamadoId={chatAberto.id} nomCliente={chatAberto.nome} userProfile={userProfile} onClose={() => setChatAberto(null)} />}
      
      {isSelecaoOpen && !showFormNf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '45px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{fontWeight:'900', marginBottom:'30px'}}>Novo Chamado</h3>
            <button onClick={() => setShowFormNf(true)} style={{ width:'100%', background:'#22c55e', color:'white', padding:'20px', borderRadius:'15px', border:'none', fontWeight:'bold', cursor:'pointer', marginBottom:'15px' }}>📑 NOTA FISCAL / FATURAMENTO</button>
            <button onClick={() => setIsSelecaoOpen(false)} style={{ background:'none', color:'#999', border:'none', cursor:'pointer' }}>CANCELAR</button>
          </div>
        </div>
      )}

      {/* DETALHE PIX PARA O FINANCEIRO */}
      {tarefaSelecionada?.status === 'validar_pix' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '40px', width: '90%', maxWidth: '450px', textAlign: 'center' }}>
            <h3 style={{fontWeight:'900'}}>Validar Recebimento PIX</h3>
            <p style={{fontSize:'13px', margin:'15px 0'}}>Cliente: <b>{tarefaSelecionada.nom_cliente}</b></p>
            <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" style={{ display:'block', background:'#eff6ff', color: '#1d4ed8', padding:'15px', borderRadius:'15px', textDecoration:'none', fontWeight:'bold', marginBottom:'20px' }}>👁 VER COMPROVANTE PIX</a>
            <button onClick={handleAvanco} style={{ width:'100%', background:'#22c55e', color: 'white', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>MUDAR PARA FASE PAGAMENTO EFETUADO</button>
            <button onClick={() => setTarefaSelecionada(null)} style={{ marginTop: '15px', background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}>FECHAR</button>
          </div>
        </div>
      )}

    </div>
  )
}