'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// ÍCONES COMPLETOS
import { 
 Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
 CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
 Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Settings, RefreshCw, AlertCircle, Tag, Lock, DollarSign, Barcode, ZoomIn, ZoomOut
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO ---
function LoadingScreen() {
 return (
  <div style={{ position: 'fixed', inset: 0, background: '#212124', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
    <h1 style={{ color: '#f8fafc', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
      Sincronizando Kanban <br /> <span style={{ fontSize: '32px', fontWeight:'400', color: '#9e9e9e' }}>Nova Tratores</span>
    </h1>
  </div>
 )
}

// --- 2. FORMATADOR DE DATA PT-BR ---
const formatarDataBR = (dataStr) => {
 if (!dataStr || dataStr === 'null' || dataStr === "") return 'N/A';
 try {
  const apenasData = dataStr.split(' ')[0];
  const partes = apenasData.split(/[-/]/);
  if (partes.length === 3) {
   if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`; 
   return `${partes[0]}/${partes[1]}/${partes[2]}`;
  }
  return dataStr;
 } catch (e) { return dataStr; }
};

function GeometricBackground() {
 return (
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#2a2a2d', pointerEvents: 'none' }}>
   <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(42, 42, 45, 0.4) 100%)' }}></div>
  </div>
 )
}

// --- 3. CHAT INTERNO ---
function ChatChamado({ registroId, userProfile }) {
 const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
 
 useEffect(() => {
  if (!registroId || !userProfile?.id) return;
  supabase.from('mensagens_chat').select('*').eq('chamado_id', registroId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
  const channel = supabase.channel(`chat_pv_k_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${registroId}` }, payload => { 
   if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
  }).subscribe();
  return () => { supabase.removeChannel(channel) }
 }, [registroId, userProfile?.id]);

 const enviar = async (e) => {
  e.preventDefault(); if (!novaMsg.trim()) return;
  const texto = novaMsg; setNovaMsg('');
  setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
  await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: registroId }]);
 }

 return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #55555a', borderRadius: '24px', overflow: 'hidden', background: '#242427', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
   <div style={{ padding: '18px 25px', background: '#3f3f44', borderBottom: '1px solid #55555a', fontSize: '13px', color: '#9e9e9e', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
   <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {mensagens.map((m) => (
     <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#3b82f625' : '#3f3f44', color: '#fff', padding: '14px 18px', borderRadius: '18px', maxWidth: '85%', border: '1px solid #55555a' }}>
      <span style={{ fontSize: '9px', opacity: 0.6, display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>{m.usuario_nome}</span>
      <span style={{ fontSize: '15px', lineHeight: '1.4' }}>{m.texto}</span>
     </div>
    ))}
   </div>
   <form onSubmit={enviar} style={{ padding: '20px', background: '#3f3f44', display: 'flex', gap: '12px' }}>
     <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #55555a', background: '#2a2a2d', color: '#fff', outline: 'none', fontSize: '16px' }} />
     <button style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '14px', width: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={20} /></button>
   </form>
  </div>
 )
}

// --- 4. COMPONENTE KANBAN PRINCIPAL ---
export default function Kanban() {
 const [chamados, setChamados] = useState([]); const [userProfile, setUserProfile] = useState(null);
 const [tarefaSelecionada, setTarefaSelecionada] = useState(null); const [loading, setLoading] = useState(true);
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [zoom, setZoom] = useState(1);
 
 const [filtroCliente, setFiltroCliente] = useState('');
 const [filtroNF, setFiltroNF] = useState('');
 const [filtroData, setFiltroData] = useState('');

 const router = useRouter();

 const colunas = [
  { id: 'gerar_boleto', titulo: 'GERAR BOLETO' },
  { id: 'enviar_cliente', titulo: 'ENVIAR PARA CLIENTE' },
  { id: 'aguardando_vencimento', titulo: 'AGUARDANDO VENCIMENTO' },
  { id: 'pago', titulo: 'PAGO' },
  { id: 'vencido', titulo: 'VENCIDO' }
 ];

 const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (e) { console.error(e); }
 };

 // --- CARREGAMENTO UNIFICADO: FIM DOS CARDS FILHOS ---
 const carregarDados = async () => {
  try {
    const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false});
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    
    const processados = (data || []).map(c => {
      let st = c.status || 'gerar_boleto';
      const venc = c.vencimento_boleto ? new Date(c.vencimento_boleto) : null;
      if (venc) venc.setHours(0,0,0,0);
      
      const isOverdue = venc && venc < hoje;
      if (st === 'aguardando_vencimento' && isOverdue) st = 'vencido';

      // Lógica de Pagamento Realizado (Todas as parcelas com comprovante)
      let todosPagos = false;
      const isParceladoLocal = c.forma_pagamento?.toLowerCase().includes('parcelado');
      
      if (isParceladoLocal) {
          const qtd = parseInt(c.qtd_parcelas) || 1;
          let conferidos = 0;
          if (c.comprovante_pagamento || c.comprovante_pagamento_p1) conferidos++;
          for (let i = 2; i <= qtd; i++) {
              if (c[`comprovante_pagamento_p${i}`]) conferidos++;
          }
          todosPagos = (conferidos === qtd);
      } else {
          todosPagos = !!(c.comprovante_pagamento || c.comprovante_pagamento_p1);
      }

      const linkComprovante = c.comprovante_pagamento || c.comprovante_pagamento_p1 || c.comprovante_pagamento_p2 || c.comprovante_pagamento_p3 || c.comprovante_pagamento_p4 || c.comprovante_pagamento_p5;

      return { 
        ...c, 
        status: st, 
        valor_exibicao: c.valor_servico,
        isVencidoDisplay: isOverdue,
        isTarefaPagamentoRealizado: todosPagos, 
        isPagamentoRealizado: todosPagos,
        linkAcessoRapido: linkComprovante
      };
    });
    setChamados(processados);
  } catch (err) { console.error(err); }
 }

 useEffect(() => {
    const channel = supabase
      .channel('realtime_pv_kanban')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(channel) };
 }, []);

 useEffect(() => {
  const init = async () => {
   try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) return router.push('/login');
    const { data: prof, error: profError } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
    if (!profError) setUserProfile(prof);
    await carregarDados();
   } catch (e) { console.error(e); }
   finally { setLoading(false); }
  }; init();
 }, [router]);

 const handleUpdateField = async (id, field, value) => {
    await supabase.from('Chamado_NF').update({ [field]: value }).eq('id', id);
    carregarDados();
    if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: value }));
 };

 const handleUpdateFileDirect = async (id, field, file) => {
    if(!file) return;
    try {
      const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      
      await supabase.from('Chamado_NF').update({ [field]: linkData.publicUrl }).eq('id', id);
      alert("Arquivo atualizado!");
      carregarDados();
      if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: linkData.publicUrl }));
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleConfirmarEnvioPV = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'aguardando_vencimento', tarefa: 'Aguardando Vencimento' }).eq('id', t.id);
    alert("Card movido para Aguardando Vencimento!");
    setTarefaSelecionada(null); carregarDados();
 };

 const handleMoverParaPago = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'pago', tarefa: 'Pagamento Confirmado' }).eq('id', t.id);
    alert("Processo movido para PAGO!");
    setTarefaSelecionada(null); carregarDados();
 };

 const chamadosFiltrados = chamados.filter(c => {
    const matchCliente = c.nom_cliente?.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchNF = (c.num_nf_servico?.toString().includes(filtroNF) || c.num_nf_peca?.toString().includes(filtroNF));
    const matchData = filtroData ? c.vencimento_boleto === filtroData : true;
    return matchCliente && matchNF && matchData;
 });

 if (loading) return <LoadingScreen />

 const isBoleto30 = tarefaSelecionada?.forma_pagamento?.toLowerCase().includes('30 dias');
 const isParcelamento = tarefaSelecionada?.forma_pagamento?.toLowerCase().includes('parcelado');
 const valorIndividual = tarefaSelecionada ? (tarefaSelecionada.valor_servico / (tarefaSelecionada.qtd_parcelas || 1)).toFixed(2) : 0;

 return (
  <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Montserrat, sans-serif', background: '#2a2a2d', overflow: 'hidden' }}>
   <GeometricBackground />
   <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/kanban" router={router} handleLogout={handleLogout} userProfile={userProfile} />

   <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, display: 'flex', flexDirection: 'column', transition: '0.4s ease', height: '100vh', overflow: 'hidden' }}>
    <header style={{ padding: '50px 50px 30px 50px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
     <div>
        <h1 style={{ fontWeight: '300', fontSize:'52px', color:'#f8fafc', letterSpacing:'-2px', margin: 0 }}>Fluxo Pós-Vendas</h1>
        <div style={{ display:'flex', gap:'20px', marginTop:'30px' }}>
            <div style={{ position: 'relative', width: '350px' }}>
                <Search size={20} style={iconFilterStyle} />
                <input type="text" placeholder="Filtrar Cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={inputFilterStyle} />
            </div>
            <div style={{ position: 'relative', width: '200px' }}>
                <Hash size={20} style={iconFilterStyle} />
                <input type="text" placeholder="Nº Nota..." value={filtroNF} onChange={e => setFiltroNF(e.target.value)} style={inputFilterStyle} />
            </div>
            <div style={{ position: 'relative', width: '220px' }}>
                <Calendar size={20} style={iconFilterStyle} />
                <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={inputFilterStyle} />
            </div>
        </div>
     </div>

     <div style={{ display: 'flex', alignItems: 'center', background: '#313134', border: '1px solid #55555a', borderRadius: '12px', padding: '8px 20px', gap: '15px' }}>
        <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} style={zoomBtnStyle} title="Diminuir"><ZoomOut size={20} /></button>
        <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff', minWidth: '50px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))} style={zoomBtnStyle} title="Aumentar"><ZoomIn size={20} /></button>
     </div>
    </header>

    <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: '25px', 
        overflowX: 'auto', 
        overflowY: 'hidden', 
        padding: '0 50px 40px 50px', 
        boxSizing: 'border-box',
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        width: `${100 / zoom}%`
    }}>
     {colunas.map(col => (
      <div key={col.id} style={{ minWidth: '420px', flex: 1, display: 'flex', flexDirection: 'column' }}>
       <h3 style={{ background: '#313134', color: '#9e9e9e', padding: '20px', borderRadius: '16px', marginBottom: '25px', textAlign: 'center', fontWeight:'400', fontSize:'16px', letterSpacing:'1px', border: '1px solid #55555a', flexShrink: 0 }}>{col.titulo}</h3>
       
       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '5px' }}>
        {chamadosFiltrados.filter(c => {
           if(col.id === 'gerar_boleto') return c.status === 'gerar_boleto' || c.status === 'validar_pix';
           if(col.id === 'aguardando_vencimento') return c.status === 'aguardando_vencimento' && (c.isVencidoDisplay || c.isTarefaPagamentoRealizado);
           return c.status === col.id;
        }).map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="kanban-card">
          <div style={{ background: t.status === 'vencido' ? '#fca5a520' : (t.status === 'pago' ? '#4ade8020' : '#313134'), padding: '25px', color: '#fff', borderBottom: '1px solid #55555a' }}>
           <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '400', color: t.status === 'vencido' ? '#fca5a5' : (t.status === 'pago' ? '#4ade80' : '#fff') }}>{t.nom_cliente?.toUpperCase()}</h4>
           
           {t.isTarefaPagamentoRealizado && (
             <div style={{ marginTop: '12px', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '8px 12px', borderRadius: '4px', display: 'flex', justifyContent:'space-between', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>
                <div style={{display:'flex', alignItems:'center', gap:'6px'}}><CheckCircle size={14}/> PAGAMENTO REALIZADO</div>
                {t.linkAcessoRapido && <Eye size={16} onClick={(e) => {e.stopPropagation(); window.open(t.linkAcessoRapido, '_blank')}} style={{cursor:'pointer'}} title="Ver comprovante"/>}
             </div>
           )}
          </div>
          <div style={{ padding: '25px', background:'#4e4e52' }}>
           <div style={cardInfoStyle}><CreditCard size={16}/> <span>FORMA:</span> {t.forma_pagamento?.toUpperCase()}</div>
           <div style={cardInfoStyle}><Calendar size={16}/> <span>VENC:</span> {formatarDataBR(t.vencimento_boleto)}</div>
           <div style={{fontSize:'32px', fontWeight:'400', margin:'15px 0', color:'#fff'}}>R$ {t.valor_exibicao}</div>
           <div style={miniTagStyle}>ID: {t.id}</div>
          </div>
         </div>
        ))}
       </div>
      </div>
     ))}
    </div>
   </main>

   {/* --- MODAL DETALHES --- */}
   {tarefaSelecionada && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
     <div style={{ background: '#ffffff', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.6)', border: '1px solid #55555a' }}>
      
      <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto', color: '#1e293b' }}>
        <button onClick={() => setTarefaSelecionada(null)} className="btn-back-light"><ArrowLeft size={18}/> VOLTAR AO PAINEL</button>
        <h2 style={{fontSize:'32px', fontWeight:'400', margin:'25px 0', letterSpacing:'-1px', color:'#0f172a', lineHeight: '1'}}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
        
        <div style={{display:'flex', gap:'30px', marginBottom:'45px'}}>
          <div style={fieldBoxModal}><label style={labelMStyle}>CONDIÇÃO</label><p style={pModalStyle}>{tarefaSelecionada.forma_pagamento?.toUpperCase()}</p></div>
          <div style={fieldBoxModal}>
            <label style={labelMStyle}>VALOR TOTAL</label>
            <input type="number" style={{ ...inputStyleLight, border: 'none', background: 'transparent', padding: '0', fontSize: '36px', fontWeight:'700' }} defaultValue={tarefaSelecionada.valor_servico} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'valor_servico', e.target.value)} />
          </div>
          {isBoleto30 && (
            <div style={fieldBoxModal}>
              <label style={labelMStyle}>DATA VENCIMENTO</label>
              <input type="date" style={{ ...inputStyleLight, border: 'none', background: 'transparent', padding: '0', fontSize: '36px', fontWeight:'700', color: tarefaSelecionada.status === 'vencido' ? '#f43f5e' : '#1e293b' }} defaultValue={tarefaSelecionada.vencimento_boleto} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'vencimento_boleto', e.target.value)} />
            </div>
          )}
        </div>

        {!isBoleto30 && isParcelamento && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', background:'#f8fafc', padding:'40px', borderRadius:'30px', border:'1px solid #dcdde1', marginBottom: '45px' }}>
             <div style={{ display:'flex', gap:'40px', borderBottom:'1px solid #dcdde1', paddingBottom:'20px' }}>
                <div><label style={labelMStyle}>QUANTIDADE</label><select style={{ ...inputStyleLight, width: '120px', padding: '10px' }} value={tarefaSelecionada.qtd_parcelas || 1} onChange={e => handleUpdateField(tarefaSelecionada.id, 'qtd_parcelas', e.target.value)}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}x</option>)}</select></div>
                <div><label style={labelMStyle}>VALOR PARCELA</label><p style={{fontSize:'22px', fontWeight:'700'}}>R$ {valorIndividual}</p></div>
             </div>
             <div style={{ display:'flex', flexDirection:'column', gap: '15px' }}>
                <div style={cascadeRowStyle}>
                  <span style={cascadeLabelStyle}>1ª PARCELA</span>
                  <input type="date" style={inputCascadeStyle} defaultValue={tarefaSelecionada.vencimento_boleto} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'vencimento_boleto', e.target.value)} />
                  <span style={cascadeValueStyle}>R$ {valorIndividual}</span>
                  <AttachmentTag label="COMPROVANTE P1" fileUrl={tarefaSelecionada.comprovante_pagamento || tarefaSelecionada.comprovante_pagamento_p1} onUpload={f => handleUpdateFileDirect(tarefaSelecionada.id, 'comprovante_pagamento_p1', f)} />
                </div>
                {Array.from({ length: (tarefaSelecionada.qtd_parcelas || 1) - 1 }).map((_, i) => {
                  const pNum = i + 2;
                  const currentDates = (tarefaSelecionada.datas_parcelas || "").split(/[\s,]+/);
                  return (
                    <div key={pNum} style={cascadeRowStyle}>
                      <span style={cascadeLabelStyle}>{pNum}ª PARCELA</span>
                      <input type="date" style={inputCascadeStyle} defaultValue={currentDates[i] || ""} onBlur={e => { let arr = [...currentDates]; arr[i] = e.target.value; handleUpdateField(tarefaSelecionada.id, 'datas_parcelas', arr.filter(d => d).join(', ')); }} />
                      <span style={cascadeValueStyle}>R$ {valorIndividual}</span>
                      <AttachmentTag label={`COMPROVANTE P${pNum}`} fileUrl={tarefaSelecionada[`comprovante_pagamento_p${pNum}`]} onUpload={f => handleUpdateFileDirect(tarefaSelecionada.id, `comprovante_pagamento_p${pNum}`, f)} />
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px', background:'#f8fafc', padding:'45px', borderRadius:'30px', border:'1px solid #dcdde1' }}>
          <div style={fieldBoxInner}><label style={labelMStyle}>NF SERVIÇO</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'num_nf_servico', e.target.value)} /></div>
          <div style={fieldBoxInner}><label style={labelMStyle}>NF PEÇA</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'num_nf_peca', e.target.value)} /></div>
          <div style={{gridColumn:'span 2', ...fieldBoxInner}}><label style={labelMStyle}>OBSERVAÇÕES</label><textarea style={{...inputStyleLight, height:'100px', resize: 'none'}} defaultValue={tarefaSelecionada.obs} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'obs', e.target.value)} /></div>
        </div>

        <div style={{marginTop:'40px'}}>
            <label style={labelMStyle}>DOCUMENTAÇÃO BASE</label>
            <div style={{display:'flex', gap:'15px', flexWrap:'wrap', marginTop:'15px'}}>
                <AttachmentTag label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_nf_peca', file)} />
                <AttachmentTag label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_nf_servico', file)} />
                <AttachmentTag label="BOLETO" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_boleto', file)} />
            </div>
        </div>

        <div style={{marginTop:'50px', display:'flex', gap:'20px'}}>
            {(tarefaSelecionada.isTarefaPagamentoRealizado || isBoleto30) && (
                <button onClick={() => handleMoverParaPago(tarefaSelecionada)} style={btnSuccessBeautified}>
                    <CheckCircle size={24}/> CONCLUÍDO - MOVER PARA PAGO
                </button>
            )}
            
            {tarefaSelecionada.status === 'enviar_cliente' && (
                <button onClick={() => handleConfirmarEnvioPV(tarefaSelecionada)} style={{...btnSuccessBeautified, background:'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
                    <Send size={24}/> MARCAR COMO ENVIADO AO CLIENTE
                </button>
            )}
        </div>
      </div>

      <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft:'1px solid #dcdde1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '95%', height: '92%' }}>
         {userProfile && <ChatChamado registroId={tarefaSelecionada.id} userProfile={userProfile} />}
        </div>
      </div>
     </div>
    </div>
   )}

   <style jsx global>{`
    * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; box-sizing: border-box; }
    .kanban-card { background: #313134; border: 1px solid #55555a; border-radius: 20px; cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; margin-bottom: 5px; }
    .kanban-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.6); border-color: #71717a; }
    .btn-back-light { background: #ffffff; color: #64748b; border: 1px solid #dcdde1; padding: 10px 24px; border-radius: 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size:14px; transition: 0.2s; }
    ::-webkit-scrollbar { width: 8px; height: 12px; }
    ::-webkit-scrollbar-thumb { background: #55555a; border-radius: 10px; }
   `}</style>
  </div>
 )
}

function AttachmentTag({ icon, label, fileUrl, onUpload, disabled = false }) {
    const fileInputRef = useRef(null);
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth:'320px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '0 18px', color: '#64748b', background: '#f1f5f9', display: 'flex', alignItems: 'center', height: '100%' }}>{icon || <Paperclip size={18}/>}</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '12px 15px' }}>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '800', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ fontSize: '11px', color: fileUrl ? '#10b981' : '#f43f5e', fontWeight: '700' }}>{fileUrl ? 'ARQUIVO PRONTO' : 'PENDENTE'}</span>
            </div>
            <div style={{ display: 'flex', borderLeft: '1px solid #e2e8f0' }}>
                {fileUrl && <button onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn} title="Visualizar"><Eye size={18} color="#1e293b" /></button>}
                {!disabled && <button onClick={() => fileInputRef.current.click()} style={miniActionBtn} title="Anexar"><RefreshCw size={18} color="#1e293b" /><input type="file" ref={fileInputRef} hidden onChange={e => onUpload(e.target.files[0])} /></button>}
            </div>
        </div>
    );
}

const cascadeRowStyle = { display: 'grid', gridTemplateColumns: '140px 180px 150px 320px', gap: '25px', alignItems: 'center', background: '#ffffff', padding: '15px', borderBottom: '1px solid #f1f5f9' };
const cascadeLabelStyle = { fontSize: '11px', color: '#94a3b8', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' };
const inputCascadeStyle = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', padding: '10px', fontSize: '14px', outline: 'none' };
const cascadeValueStyle = { fontSize: '18px', color: '#0f172a', fontWeight: '700' };
const inputFilterStyle = { padding: '16px 20px 16px 52px', width: '100%', borderRadius: '14px', border: '1px solid #55555a', outline: 'none', background:'#3f3f44', color:'#fff', fontSize: '18px', boxSizing:'border-box' };
const iconFilterStyle = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9e9e9e', zIndex: 10 };
const cardInfoStyle = { display:'flex', alignItems:'center', gap:'12px', color:'#d1d5db', fontSize:'14px', marginBottom:'10px' };
const miniTagStyle = { background:'#3f3f44', padding:'8px 12px', borderRadius:'10px', fontSize:'11px', color:'#fff', border:'1px solid #55555a' };
const labelMStyle = { fontSize:'14px', color:'#64748b', textTransform:'uppercase', fontWeight: '700', marginBottom: '8px' };
const pModalStyle = { fontSize:'24px', color:'#0f172a', margin: 0, fontWeight: '700' };
const fieldBoxModal = { border: '1px solid #e2e8f0', padding: '30px', background: '#ffffff', flex: 1, borderRadius: '15px' };
const fieldBoxInner = { padding: '0px' };
const inputStyleLight = { width: '100%', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none', background:'#fff', color:'#0f172a', fontSize: '16px' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const btnSuccessBeautified = { flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color:'#ffffff', border:'none', padding:'25px', borderRadius:'15px', cursor:'pointer', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)', transition: '0.3s' };
const zoomBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer' };
const labelModalStyle = { fontSize:'14px', color:'#9e9e9e', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px', display:'block' };