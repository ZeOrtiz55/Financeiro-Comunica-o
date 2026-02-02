'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DE ÍCONES COMPLETA
import { 
  Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
  CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
  Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
  CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Settings, RefreshCw
} from 'lucide-react'

// --- COMPONENTE DE FUNDO COM OBJETOS ABSTRATOS ---
function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=900" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070" style={{ position: 'absolute', top: '25%', left: '10%', width: '600px', opacity: 0.08, filter: 'blur(2px)' }} alt="" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
            Controle de Boletos <br /> <span style={{ fontSize: '32px' }}>Nova Tratores</span>
        </h1>
    </div>
  )
}

const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null' || typeof dataStr !== 'string') return '';
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr; 
  const anoCurto = partes[0].slice(-2); 
  return `${partes[2]}/${partes[1]}/${anoCurto}`;
};

// --- 1. CHAT INTERNO (DENTRO DOS CARDS) ---
function ChatChamado({ registroId, tipo, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()
  const colunaId = tipo === 'boleto' ? 'chamado_id' : tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : 'rh_id';

  useEffect(() => {
    if (!registroId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq(colunaId, registroId).order('created_at', { ascending: true })
      .then(({ data }) => setMensagens(data || []))
    const channel = supabase.channel(`chat_kbn_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaId}=eq.${registroId}` }, payload => { 
      if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) 
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [registroId, userProfile?.id, tipo, colunaId])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    const insertData = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id };
    insertData[colunaId] = registroId;
    const { error } = await supabase.from('mensagens_chat').insert([insertData])
    if (error) alert("Erro: " + error.message)
    else setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', color: '#64748b', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mensagens.map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
            <span style={{ fontSize: '8px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>{m.usuario_nome?.toUpperCase()}</span>
            <span style={{ fontSize: '14px' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
        <button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px', cursor: 'pointer' }}><Send size={18} /></button>
      </form>
    </div>
  )
}

// --- 2. CHAT FLUTUANTE GERAL ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [novaMsg, setNovaMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (!userProfile?.id) return;
    const load = async () => {
        const { data } = await supabase.from('mensagens_chat').select('*').is('chamado_id', null).is('pagar_id', null).is('receber_id', null).is('rh_id', null).order('created_at', { ascending: true }).limit(100);
        setMensagens(data || []);
    }
    load();
    const channel = supabase.channel('chat_geral_kbn').on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_chat' }, p => { load() }).subscribe();
    return () => { supabase.removeChannel(channel) };
  }, [userProfile?.id, isOpen]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      await supabase.storage.from('chat-midia').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-midia').getPublicUrl(fileName);
      await supabase.from('mensagens_chat').insert([{ texto: file.type.startsWith('image') ? '📷 Foto' : '📎 Arquivo', midia_url: publicUrl, usuario_id: userProfile.id, usuario_nome: userProfile.nome, data_hora: new Date().toISOString() }]);
    } catch (err) { alert("Erro upload: " + err.message); }
    finally { setUploading(false); }
  }

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return;
    const t = novaMsg; setNovaMsg('');
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, data_hora: new Date().toISOString() }]);
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000, fontFamily: 'Montserrat' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '75px', height: '75px', borderRadius: '25px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {isOpen ? <X size={34} /> : <MessageSquare size={34} />}
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '95px', right: 0, width: '500px', height: '750px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '35px', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px rgba(0,0,0,0.3)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
           <div style={{ padding: '25px', background: '#0f172a', color: '#fff', fontSize:'18px' }}>CENTRAL DE COMUNICAÇÃO NOVA</div>
           <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {mensagens.map(m => {
                const souEu = String(m.usuario_id) === String(userProfile.id);
                const hora = m.data_hora ? new Date(m.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                return (
                  <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', maxWidth:'80%' }}>
                    <div style={{ background: souEu ? '#0f172a' : '#fff', color: souEu ? '#fff' : '#000', padding: '15px', borderRadius: '20px', border:'1px solid #e2e8f0' }}>
                      <span style={{fontSize:'10px', display:'block', opacity:0.6}}>{m.usuario_nome?.toUpperCase()}</span>
                      {m.midia_url && <div style={{margin:'10px 0'}}><a href={m.midia_url} target="_blank" style={{color:'inherit', fontSize:'12px', display:'flex', alignItems:'center', gap:'5px'}}><FileText size={16}/> VER ANEXO</a></div>}
                      <div style={{fontSize:'16px'}}>{m.texto}</div>
                      <div style={{textAlign:'right', fontSize:'10px', opacity:0.5, marginTop:'5px'}}>{hora}</div>
                    </div>
                  </div>
                )
              })}
           </div>
           <form onSubmit={enviar} style={{ padding: '25px', display: 'flex', gap: '15px', borderTop:'1px solid #e2e8f0', alignItems:'center' }}>
              <label style={{cursor:'pointer'}}><Paperclip size={24} color="#64748b" /><input type="file" hidden onChange={handleUpload} /></label>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{flex:1, padding:'18px', borderRadius:'15px', border:'1px solid #e2e8f0', outline:'none'}} />
              <button disabled={uploading} style={{background:'#0f172a', color:'#fff', border:'none', borderRadius:'15px', width:'60px', height:'60px', cursor:'pointer'}}><Send size={24}/></button>
           </form>
        </div>
      )}
    </div>
  );
}

// --- 3. KANBAN PAGE PRINCIPAL ---
export default function KanbanPage() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const [fileBoleto, setFileBoleto] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const router = useRouter()

  const colunas = [
    { id: 'gerar_boleto', titulo: 'GERAR BOLETO' },
    { id: 'enviar_cliente', titulo: 'ENVIAR CLIENTE' },
    { id: 'aguardando_vencimento', titulo: 'EM ABERTO' },
    { id: 'vencido', titulo: 'VENCIDO' },
    { id: 'pago', titulo: 'PAGO' }
  ]

  const carregarDados = async () => {
    const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
    const hoje = new Date();
    let cardsProcessados = [];

    (data || []).forEach(c => {
      if (c.qtd_parcelas > 1 && c.datas_parcelas) {
        const datas = c.datas_parcelas.split(/[\s,]+/).filter(d => d.includes('-'));
        
        datas.forEach((dataParc, index) => {
          const numParc = index + 1;
          const vencParc = new Date(dataParc);
          
          // Lógica de Movimentação Individual baseada nas novas colunas p1, p2...
          // Agora o card filho usa o status individual para saber em qual coluna ficar
          let statusIndividual = c[`status_p${numParc}`] || 'aguardando_vencimento';
          let tarefaIndividual = c[`tarefa_p${numParc}`] || `Parcela ${numParc}/${c.qtd_parcelas}`;

          // Se a parcela venceu e ainda está no padrão "aguardando", move para "pago"
          if (vencParc < hoje && statusIndividual === 'aguardando_vencimento') {
            statusIndividual = 'pago';
            tarefaIndividual = `Boleto Vencido: Verificar Pagamento (Parcela ${numParc})`;
            supabase.from('Chamado_NF').update({ 
                [`status_p${numParc}`]: statusIndividual, 
                [`tarefa_p${numParc}`]: tarefaIndividual 
            }).eq('id', c.id);
          }

          const valorDaParcela = c[`valor_parcela${numParc}`] || (c.valor_servico / c.qtd_parcelas).toFixed(2);

          cardsProcessados.push({
            ...c,
            id_virtual: `${c.id}_p${numParc}`,
            nom_cliente: `${c.nom_cliente} (PARC ${numParc})`,
            vencimento_boleto: dataParc,
            valor_exibicao: valorDaParcela,
            status: statusIndividual, // O status individual define a coluna
            tarefa: tarefaIndividual,
            numParcelaReferencia: numParc,
            isChild: true
          });
        });
      } else {
        const itemNormal = { ...c, valor_exibicao: c.valor_servico };
        if (c.vencimento_boleto && new Date(c.vencimento_boleto) < hoje && c.status !== 'pago' && c.status !== 'vencido' && c.status !== 'gerar_boleto') {
            supabase.from('Chamado_NF').update({ status: 'pago', tarefa: 'Boleto Vencido: Verificar Pagamento' }).eq('id', c.id);
            itemNormal.status = 'pago';
            itemNormal.tarefa = 'Boleto Vencido: Verificar Pagamento';
        }
        cardsProcessados.push(itemNormal);
      }
    });

    setChamados(cardsProcessados)
  }

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      await carregarDados()
      setLoading(false)
    }
    carregar()
  }, [router])

  useEffect(() => {
    if (userProfile) {
      const channel = supabase.channel('notificacoes_kanban')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Chamado_NF' }, payload => {
           carregarDados();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel) };
    }
  }, [userProfile]);

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    router.push('/login'); 
  }

  const handleUpdateField = async (id, field, value) => {
    const finalValue = (value === "" && (field.includes('data') || field.includes('vencimento'))) ? null : value;
    
    if (typeof id === 'string' && id.includes('_p')) {
      const [idReal, pNum] = id.split('_p');
      const fieldNameIndividual = `${field}_p${pNum}`;
      await supabase.from('Chamado_NF').update({ [fieldNameIndividual]: finalValue }).eq('id', idReal);
      // Atualiza o estado local do card filho
      setTarefaSelecionada(prev => ({...prev, [field]: finalValue}));
    } else {
      const updateData = { [field]: finalValue };
      if (field === 'status' && value === 'vencido') {
        updateData.data_entrada_vencido = new Date().toISOString();
      }
      await supabase.from('Chamado_NF').update(updateData).eq('id', id);
      setTarefaSelecionada(prev => ({...prev, ...updateData}));
    }
  };

  const handleIncrementRecobranca = async (id, currentVal) => {
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const newVal = (currentVal || 0) + 1;
    await supabase.from('Chamado_NF').update({ recombrancas_qtd: newVal }).eq('id', idReal);
    setTarefaSelecionada(prev => ({...prev, recombrancas_qtd: newVal}));
  };

  const handleUpdateFile = async (id, field, file) => {
    if(!file) return;
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const cleanName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `anexos/${Date.now()}-${cleanName}`;
    
    try {
      await supabase.storage.from('anexos').upload(path, file);
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      await supabase.from('Chamado_NF').update({ [field]: linkData.publicUrl }).eq('id', idReal);
      
      setTarefaSelecionada(prev => ({...prev, [field]: linkData.publicUrl}));
      alert("Arquivo anexado com sucesso!");
    } catch (err) {
      alert("Erro ao subir arquivo: " + err.message);
    }
  };

  const handleGerarBoletoFaturamento = async (id) => {
    if (!fileBoleto) return alert("Anexe o boleto.")
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const cleanName = fileBoleto.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `boletos/${Date.now()}-${cleanName}`
    await supabase.storage.from('anexos').upload(path, fileBoleto)
    const { data } = supabase.storage.from('anexos').getPublicUrl(path)
    
    if (typeof id === 'string' && id.includes('_p')) {
        const pNum = id.split('_p')[1];
        await supabase.from('Chamado_NF').update({ 
            [`status_p${pNum}`]: 'enviar_cliente', 
            [`tarefa_p${pNum}`]: 'Enviar Boleto para o Cliente',
            anexo_boleto: data.publicUrl 
        }).eq('id', idReal);
    } else {
        await supabase.from('Chamado_NF').update({ status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl }).eq('id', idReal);
    }
    alert("Tarefa gerada!"); window.location.reload();
  }

  const chamadosFiltrados = chamados.filter(c => 
    c.nom_cliente?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    c.id.toString().includes(pesquisa) ||
    c.num_nf_peca?.toString().includes(pesquisa) ||
    c.num_nf_servico?.toString().includes(pesquisa)
  )

  const btnSidebarStyle = { background: 'none', color: '#000', border: 'none', padding: '20px 0', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', width: '100%', transition: '0.3s' }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: 'transparent' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <GeometricBackground />

      <aside onMouseEnter={()=>setIsSidebarOpen(true)} onMouseLeave={()=>setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '320px' : '85px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #cbd5e1', padding: '30px 0', display: 'flex', flexDirection: 'column', transition: '0.4s', zIndex: 1100, overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                {isSidebarOpen ? <span style={{color:'#000', fontSize:'22px', letterSpacing:'3px', fontWeight:'900'}}>NOVA</span> : <Menu size={32} color="#000" />}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => router.push('/')} style={btnSidebarStyle}><div style={{minWidth:'85px', display:'flex', justifyContent:'center'}}><LayoutDashboard size={28}/></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>TAREFAS</span></button>
                <button onClick={() => router.push('/kanban')} style={{...btnSidebarStyle, background: 'rgba(0,0,0,0.05)'}}><div style={{minWidth:'85px', display:'flex', justifyContent:'center'}}><ClipboardList size={28}/></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>BOLETOS</span></button>
                <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0', opacity: isSidebarOpen ? 1 : 0 }}></div>
                <button onClick={() => router.push('/historico-pagar')} style={btnSidebarStyle}><div style={{minWidth:'85px', display:'flex', justifyContent:'center'}}><TrendingDown size={28}/></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>Historico Pagar</span></button>
                <button onClick={() => router.push('/historico-receber')} style={btnSidebarStyle}><div style={{minWidth:'85px', display:'flex', justifyContent:'center'}}><TrendingUp size={28}/></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>Historico Receber</span></button>
            </nav>
        </div>
        <button onClick={handleLogout} style={{ ...btnSidebarStyle, color: '#dc2626' }}><div style={{minWidth:'85px', display:'flex', justifyContent:'center'}}><LogOut size={28}/></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>SAIR</span></button>
      </aside>

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', transition: '0.4s' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
            <div><h1 style={{ color: '#0f172a', margin: 0, fontSize:'42px', letterSpacing:'-1.5px', fontWeight:'900' }}>Controle de Boletos</h1><div style={{ width: '80px', height: '4px', background: '#000', marginTop: '15px' }}></div></div>
            <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
                <div style={{position:'relative'}}>
                  <Bell size={30} onClick={() => alert(notificacoes.join('\n') || "Sem novas notificações")} style={{cursor:'pointer'}} />
                  {notificacoes.length > 0 && <div style={{position:'absolute', top:-5, right:-5, background:'red', color:'#fff', borderRadius:'50%', width:18, height:18, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center'}}>{notificacoes.length}</div>}
                </div>
                <input type="text" placeholder="Pesquisar..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} style={{ padding: '18px 20px 18px 50px', width: '400px', borderRadius: '15px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', fontFamily: 'Montserrat', background: '#fff' }} />
            </div>
        </header>

        <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', alignItems: 'flex-start', paddingBottom:'30px' }}>
          {colunas.map(col => (
            <div key={col.id} style={{ minWidth: '380px', flex: 1 }}>
              <h3 style={{ background: '#000', color: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '25px', fontSize: '18px', textAlign: 'center', letterSpacing: '2px', fontWeight:'500' }}>{col.titulo}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {chamadosFiltrados.filter(c => c.status === col.id).map(t => {
                   const isAguardandoCobrado = t.status === 'aguardando_vencimento' && t.tarefa === 'Aguardando Vencimento (Cobrado)';
                   const deveFicarVermelho = t.status === 'vencido' || isAguardandoCobrado;
                   let diasAtraso = 0;
                   if (t.status === 'vencido' && t.data_entrada_vencido) {
                     diasAtraso = Math.floor((new Date() - new Date(t.data_entrada_vencido)) / (1000 * 60 * 60 * 24));
                   }

                   return (
                    <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'boleto' })} className="task-card" style={{ background: deveFicarVermelho ? '#fee2e2' : 'rgba(255,255,255,0.92)', border: deveFicarVermelho ? '1px solid #ef4444' : '1px solid #cbd5e1', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }}>
                      <div className="card-header-internal" style={{ background: deveFicarVermelho ? '#ef4444' : '#1e293b', padding: '25px', color: '#fff' }}>
                        <span style={{ fontSize: t.isChild ? '20px' : '28px', fontWeight:'900' }}>{t.nom_cliente?.toUpperCase()}</span>
                      </div>
                      <div style={{ padding: '25px' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <span className="payment-badge">{t.forma_pagamento?.toUpperCase()}</span>
                          {t.isChild && <span style={{fontSize:'10px', background:'#3b82f6', color:'#fff', padding:'4px 8px', borderRadius:'5px'}}>PARCELA</span>}
                        </div>
                        <div style={{marginTop:'15px', fontSize:'22px', fontWeight:'900'}}>R$ {t.valor_exibicao}</div>
                        {t.status === 'vencido' && (
                          <div style={{marginTop:'10px', color:'#ef4444', fontSize:'13px', fontWeight:'600'}}>
                            {t.recombrancas_qtd > 0 ? `RECOBRADO ${t.recombrancas_qtd} VEZES` : 'AGUARDANDO COBRANÇA'}<br/>
                            ATRASADO HÁ {diasAtraso} DIAS
                          </div>
                        )}
                        <div style={{marginTop:'10px', fontSize:'12px', opacity:0.7}}>{t.tarefa}</div>
                      </div>
                    </div>
                   )
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '35px', display: 'flex', flexDirection: 'row', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 50px 100px rgba(0,0,0,0.2)' }}>
            
            <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto', maxHeight: '95vh' }}>
              <button onClick={() => {setTarefaSelecionada(null); setFileBoleto(null)}} className="btn-back"><ArrowLeft size={16}/> VOLTAR</button>
              
              <div style={{ marginBottom: '50px' }}>
                <span style={{ fontSize: '12px', color: '#000', letterSpacing: '2px', fontWeight:'500' }}>NOME DO CLIENTE {tarefaSelecionada.isChild && '(PARCELA)'}</span>
                <h2 style={{ fontSize: '56px', color: '#0f172a', margin: '5px 0', lineHeight: 1, fontWeight:'900' }}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
                <div className="payment-badge-large">{tarefaSelecionada.forma_pagamento?.toUpperCase() || 'MÉTODO NÃO INFORMADO'}</div>
              </div>

              {/* GRID DE INFORMAÇÕES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #e2e8f0', borderRadius: '15px', overflow: 'hidden' }}>
                 <div className="info-block-grid"><label>ID PROCESSO</label><span>#{tarefaSelecionada.id}</span></div>
                 <div className="info-block-grid"><label>{tarefaSelecionada.isChild ? 'VALOR PARCELA' : 'VALOR TOTAL'}</label><span>R$ {tarefaSelecionada.valor_exibicao}</span></div>
                 <div className="info-block-grid"><label>VENCIMENTO</label><span>{formatarData(tarefaSelecionada.vencimento_boleto)}</span></div>
                 <div className="info-block-grid"><label>NF SERVIÇO</label><span>{tarefaSelecionada.num_nf_servico || '-'}</span></div>
                 <div className="info-block-grid"><label>NF PEÇA</label><span>{tarefaSelecionada.num_nf_peca || '-'}</span></div>
                 <div className="info-block-grid"><label>QTD PARCELAS</label><span>{tarefaSelecionada.qtd_parcelas || '1'}x</span></div>
              </div>

              {/* BOTÕES DE LÓGICA DE FLUXO */}
              <div style={{marginTop:'40px', display:'flex', gap:'20px', flexWrap:'wrap'}}>
                
                {tarefaSelecionada.status === 'pago' && (
                  <div style={{width:'100%', background:'#fff5f5', padding:'40px', borderRadius:'25px', border:'1.5px dashed #ef4444'}}>
                    <h4 style={{color:'#ef4444', marginBottom:'20px', fontWeight:'900'}}>REEMISSÃO POR FALTA DE PAGAMENTO</h4>
                    <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                      <div className="btn-anexo-doc" style={{borderColor:'#ef4444'}}>
                        <label className="cursor-pointer flex items-center gap-2" style={{width:'100%', color:'#ef4444', fontWeight:'600'}}>
                            <RefreshCw size={18}/> ANEXAR BOLETO COM NOVOS JUROS
                            <input type="file" hidden onChange={(e) => handleUpdateFile(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_boleto_juros', e.target.files[0])} />
                        </label>
                        {tarefaSelecionada.anexo_boleto_juros && <a href={tarefaSelecionada.anexo_boleto_juros} target="_blank" style={{color:'#ef4444'}}><Eye size={18}/></a>}
                      </div>
                      <button onClick={() => {
                        handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'status', 'vencido');
                        handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'tarefa', 'Cobrar Cliente');
                        alert("Card movido para Vencido!");
                        window.location.reload();
                      }} style={{background:'#ef4444', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900', fontSize:'16px'}}>Mover Card Para Vencido e Gerar Tarefa Pos vendas: Cobrar Cliente</button>
                    </div>
                  </div>
                )}

                {tarefaSelecionada.status === 'vencido' && (
                  <div style={{display:'flex', gap:'20px', width:'100%'}}>
                    <button onClick={() => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'status', 'pago').then(() => window.location.reload())} style={{flex: 1, background:'#0f172a', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>Confirmar Pagamento: Mover para Pago</button>
                    <button onClick={() => {
                      handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'tarefa', 'Cobrar Cliente');
                      alert("Tarefa de cobrança gerada para o Pós-Vendas!");
                      window.location.reload();
                    }} style={{flex: 1, background:'#ef4444', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>Gerar Tarefa Pos Vendas: Cobrar Cliente</button>
                  </div>
                )}

                {tarefaSelecionada.tarefa.includes('COBRAR') && (
                   <button onClick={() => {
                     handleIncrementRecobranca(tarefaSelecionada.id_virtual || tarefaSelecionada.id, tarefaSelecionada.recombrancas_qtd);
                     // PERMANECE EM VENCIDO, MUDA APENAS A TAREFA
                     handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'status', 'vencido');
                     handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'tarefa', 'Aguardando Verificação Financeiro (Cobrado)');
                     alert("Cobrança registrada! Card permanece em vencido aguardando o Financeiro.");
                     window.location.reload();
                   }} style={{width:'100%', background:'#22c55e', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>Cliente Cobrado (Registrar Recobrança)</button>
                )}

                {userProfile?.funcao !== 'Financeiro' && tarefaSelecionada.status === 'enviar_cliente' && (
                   <button onClick={() => { handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'status', 'aguardando_vencimento'); handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'tarefa', 'Aguardando Vencimento'); alert("Boleto enviado!"); window.location.reload(); }} style={{background:'#22c55e', color:'#fff', border:'none', padding:'15px 30px', borderRadius:'12px', cursor:'pointer', fontWeight:'500', fontSize:'14px'}}>Boleto enviado: Mover para Aguardando</button>
                )}
              </div>

              <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                {tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank" className="btn-anexo-doc"><FileText size={20}/> NF SERVIÇO</a>}
                {tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank" className="btn-anexo-doc"><FileText size={20}/> NF PEÇA</a>}
                {tarefaSelecionada.anexo_boleto && <a href={tarefaSelecionada.anexo_boleto} target="_blank" className="btn-anexo-doc" style={{borderColor:'#3b82f6', color:'#3b82f6'}}><Download size={20}/> BAIXAR BOLETO</a>}
                {tarefaSelecionada.anexo_boleto_juros && <a href={tarefaSelecionada.anexo_boleto_juros} target="_blank" className="btn-anexo-doc" style={{borderColor:'#ef4444', color:'#ef4444'}}><Download size={20}/> BOLETO COM JUROS</a>}
              </div>

              {/* FINANCEIRO GERA TAREFA INICIAL */}
              {userProfile?.funcao === 'Financeiro' && tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{ marginTop: '50px', padding: '40px', background: '#f0f9ff', borderRadius: '30px', border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: '11px', color: '#0369a1', letterSpacing: '2px', display:'block', marginBottom: '20px', fontWeight:'500' }}>AÇÃO DO FINANCEIRO</span>
                    <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', background:'#fff', padding:'25px', borderRadius:'20px', border:'2px dashed #3b82f6', cursor:'pointer', marginBottom:'25px' }}>
                        <Upload size={32} color="#3b82f6" />
                        <div style={{textAlign:'left'}}><span style={{fontSize:'16px', color:'#1d4ed8', display:'block', fontWeight:'500'}}>{fileBoleto ? fileBoleto.name : 'CLIQUE PARA ANEXAR O BOLETO'}</span><span style={{fontSize:'12px', color:'#60a5fa'}}>Clique para selecionar o arquivo</span></div>
                        <input type="file" hidden onChange={e => setFileBoleto(e.target.files[0])} />
                    </label>
                    <button onClick={() => handleGerarBoletoFaturamento(tarefaSelecionada.id_virtual || tarefaSelecionada.id)} style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '22px', borderRadius: '20px', cursor: 'pointer', fontSize: '16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', fontWeight:'500' }}>
                        <Send size={20}/> Gerar Tarefa para Pós Vendas: Enviar Boleto
                    </button>
                </div>
              )}
            </div>

            <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              {userProfile && <ChatChamado registroId={tarefaSelecionada?.id} tipo="boleto" userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
      
      <style jsx global>{`
        * { font-weight: 500 !important; }
        .task-card { background: rgba(255,255,255,0.95); border: 1px solid #cbd5e1; border-radius: 20px; cursor: pointer; overflow: hidden; width: 100%; box-shadow: 0 10px 15px rgba(0,0,0,0.05); transition: 0.2s; }
        .task-card:hover { transform: translateY(-5px); box-shadow: 0 15px 25px rgba(0,0,0,0.1); }
        .card-header-internal { padding: 25px; color: #fff; }
        .payment-badge { background: #000; color: #fff; padding: 5px 12px; border-radius: 8px; font-size: 12px; display: inline-block; }
        .payment-badge-large { background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 12px; display: inline-block; margin-top: 10px; font-size: 20px; font-weight:900 !important; }
        .info-block-grid { padding: 15px; border: 0.5px solid #e2e8f0; background: #fff; }
        .info-block-grid label { display: block; fontSize: 11px; color: #000; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .info-block-grid span { fontSize: 15px; color: #0f172a; }
        .btn-anexo-doc { padding: 12px 20px; background: #fff; border: 1px solid #cbd5e1; borderRadius: 12px; color: #0f172a; display: flex; alignItems: center; gap: 10px; font-size: 13px; text-decoration:none; }
        .btn-back { background: #0f172a; border: none; color: #fff; padding: 12px 24px; borderRadius: 12px; cursor: pointer; fontSize:12px; marginBottom: 30px; display:flex; alignItems:center; gap:8px; font-weight: 900 !important; }
      `}</style>
    </div>
  )
}