'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// ÍCONES MODERNOS
import { ArrowLeft, FileText, Calendar, CreditCard, User, Hash, Info, CheckCircle, Upload, Paperclip } from 'lucide-react'

// --- TELA DE CARREGAMENTO PADRONIZADA ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
            Comunicação Financeiro <br /> 
            <b style={{ fontWeight: '900', fontSize: '32px' }}>Nova Tratores</b>
        </h1>
    </div>
  )
}

export default function NovoChamadoNF() {
  const [todosUsuarios, setTodosUsuarios] = useState([])
  const [setor, setSetor] = useState('')
  const [tipoNF, setTipoNF] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const router = useRouter()

  const [formData, setFormData] = useState({
    nom_cliente: '', valor_servico: '', num_nf_servico: '', num_nf_peca: '',
    forma_pagamento: '', tarefa: '', tarefa_destinatario: '', obs: '',
    qtd_parcelas: 1
  })
  
  const [datasParcelas, setDatasParcelas] = useState(['', '', '', '', ''])
  const [fileServico, setFileServico] = useState(null)
  const [filePeca, setFilePeca] = useState(null)
  const [filePix, setFilePix] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('financeiro_usu').select('id, nome, funcao')
      if (data) setTodosUsuarios(data)
      setTimeout(() => setPageLoading(false), 600)
    }
    load()
  }, [])

  const uploadFile = async (file, path) => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const filePath = `${path}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const { error } = await supabase.storage.from('anexos').upload(filePath, file)
    if (error) throw error
    const { data } = supabase.storage.from('anexos').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setLoading(true)
    try {
      const urlS = (tipoNF === 'servico' || tipoNF === 'ambas') ? await uploadFile(fileServico, 'servicos') : null
      const urlP = (tipoNF === 'pecas' || tipoNF === 'ambas') ? await uploadFile(filePeca, 'pecas') : null
      const urlPix = (formData.forma_pagamento === 'Pix') ? await uploadFile(filePix, 'comprovantes') : null

      const isPix = formData.forma_pagamento === 'Pix'
      const statusI = isPix ? 'validar_pix' : 'gerar_boleto'
      const tarefaI = isPix ? 'Validar Recebimento Pix' : 'Gerar Boleto'
      
      // Filtra as datas e garante que campos vazios não quebrem o banco
      const datasFinal = datasParcelas.slice(0, formData.qtd_parcelas).filter(d => d !== '').join(', ')
      const vencimentoFinal = datasParcelas[0] === '' ? null : datasParcelas[0];

      const { error } = await supabase.from('Chamado_NF').insert([{
        ...formData,
        setor, 
        status: statusI, 
        tarefa: tarefaI,
        anexo_nf_servico: urlS, 
        anexo_nf_peca: urlP, 
        comprovante_pagamento: urlPix,
        vencimento_boleto: vencimentoFinal,
        datas_parcelas: datasFinal
      }])

      if (error) throw error
      alert("Sucesso! Chamado gerado no fluxo."); router.push('/')
    } catch (err) { 
      alert("Erro ao salvar: " + err.message) 
    } finally { setLoading(false) }
  }

  const glassInput = { padding: '18px 18px 18px 50px', borderRadius: '15px', border: '1px solid #cbd5e1', background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'Montserrat', fontSize: '15px', outline: 'none' }
  const labelStyle = { fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '10px', display: 'block', letterSpacing: '1px' }

  if (pageLoading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      
      <div style={{ width: '100%', maxWidth: '650px', marginBottom: '30px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <ArrowLeft size={20} /> VOLTAR AO PAINEL
          </button>
      </div>

      <div style={{ background: '#fff', padding: '50px', borderRadius: '35px', width: '100%', maxWidth: '650px', boxShadow: '0 30px 60px rgba(15, 23, 42, 0.05)', border: '1px solid #e2e8f0' }}>
        
        <h2 style={{ color: '#0f172a', fontWeight: '900', fontSize: '28px', textAlign: 'center', marginBottom: '45px', letterSpacing: '-1px' }}>Novo Faturamento</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* SELETOR DE NOTAS */}
          <div>
            <label style={labelStyle}>O QUE VOCÊ VAI LANÇAR AGORA?</label>
            <div style={{ position: 'relative' }}>
                <FileText size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <select required style={glassInput} onChange={(e) => setTipoNF(e.target.value)}>
                    <option value="">Selecione o tipo de nota...</option>
                    <option value="servico">Nota de Serviço</option>
                    <option value="pecas">Nota de Peças</option>
                    <option value="ambas">Ambas (Serviço e Peças)</option>
                </select>
            </div>
          </div>

          {/* INPUTS DE NOTA E ARQUIVO */}
          {tipoNF && (
            <div style={{ display:'flex', flexDirection:'column', gap:'25px', padding: '25px', background: '#f8fafc', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
              {(tipoNF === 'servico' || tipoNF === 'ambas') && (
                <div>
                  <label style={labelStyle}>Nº NOTA DE SERVIÇO</label>
                  <input type="text" placeholder="Número da Nota" required style={{...glassInput, paddingLeft: '20px'}} onChange={(e)=>setFormData({...formData, num_nf_servico: e.target.value})} />
                  <label style={{...labelStyle, marginTop: '15px'}}>ANEXAR DOCUMENTO NF SERVIÇO</label>
                  <input type="file" required style={{fontSize: '13px'}} onChange={(e)=>setFileServico(e.target.files[0])} />
                </div>
              )}
              {(tipoNF === 'pecas' || tipoNF === 'ambas') && (
                <div style={{ borderTop: tipoNF === 'ambas' ? '1px solid #e2e8f0' : 'none', paddingTop: tipoNF === 'ambas' ? '25px' : 0 }}>
                  <label style={labelStyle}>Nº NOTA DE PEÇAS</label>
                  <input type="text" placeholder="Número da Nota" required style={{...glassInput, paddingLeft: '20px'}} onChange={(e)=>setFormData({...formData, num_nf_peca: e.target.value})} />
                  <label style={{...labelStyle, marginTop: '15px'}}>ANEXAR DOCUMENTO NF PEÇA</label>
                  <input type="file" required style={{fontSize: '13px'}} onChange={(e)=>setFilePeca(e.target.files[0])} />
                </div>
              )}
            </div>
          )}

          {/* CLIENTE E VALOR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            <div>
                <label style={labelStyle}>NOME DO CLIENTE</label>
                <div style={{ position: 'relative' }}>
                    <User size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="Nome Completo" required style={glassInput} onChange={(e)=>setFormData({...formData, nom_cliente: e.target.value})} />
                </div>
            </div>
            <div>
                <label style={labelStyle}>VALOR TOTAL DO CHAMADO</label>
                <div style={{ position: 'relative' }}>
                    <Hash size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="number" step="0.01" placeholder="0,00" required style={glassInput} onChange={(e)=>setFormData({...formData, valor_servico: e.target.value})} />
                </div>
            </div>
          </div>

          {/* FORMA DE PAGAMENTO */}
          <div>
            <label style={labelStyle}>FORMA DE PAGAMENTO</label>
            <div style={{ position: 'relative' }}>
                <CreditCard size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <select required style={glassInput} onChange={(e)=>setFormData({...formData, forma_pagamento: e.target.value})}>
                    <option value="">Selecione a condição...</option>
                    <option value="Pix">À vista no Pix</option>
                    <option value="Boleto 30 dias">Boleto 30 dias</option>
                    <option value="Boleto Parcelado">Boleto Parcelado</option>
                    <option value="Cartão a vista">Cartão à vista</option>
                    <option value="Cartão Parcelado">Cartão Parcelado</option>
                </select>
            </div>
          </div>

          {/* COMPROVANTE PIX */}
          {formData.forma_pagamento === 'Pix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <label style={{ fontSize: '16px', fontWeight: '900', color: '#1e40af', textAlign: 'center' }}>COMPROVANTE DE PAGAMENTO OBRIGATÓRIO</label>
                <label style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', 
                    padding: '30px', background: '#eff6ff', border: '2px dashed #3b82f6', 
                    borderRadius: '20px', cursor: 'pointer', transition: '0.3s' 
                }}>
                  <Upload size={32} color="#3b82f6" />
                  <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: '#1d4ed8', display: 'block' }}>{filePix ? filePix.name : 'CLIQUE PARA ANEXAR O PIX'}</span>
                      <span style={{ fontSize: '12px', color: '#60a5fa' }}>Formatos aceitos: PDF, JPG, PNG</span>
                  </div>
                  <input type="file" required style={{ display: 'none' }} onChange={(e)=>setFilePix(e.target.files[0])} />
                </label>
            </div>
          )}

          {/* DATA PARA PIX, BOLETO 30 DIAS OU CARTÃO A VISTA */}
          {(formData.forma_pagamento === 'Pix' || formData.forma_pagamento === 'Boleto 30 dias' || formData.forma_pagamento === 'Cartão a vista') && (
            <div>
               <label style={labelStyle}>{formData.forma_pagamento === 'Pix' ? 'DATA DO PAGAMENTO' : 'DATA DE VENCIMENTO'}</label>
               <div style={{ position: 'relative' }}>
                  <Calendar size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="date" required style={glassInput} onChange={(e) => {
                    const d = [...datasParcelas]; d[0] = e.target.value; setDatasParcelas(d);
                  }} />
               </div>
            </div>
          )}

          {/* PARCELAMENTO */}
          {(formData.forma_pagamento === 'Boleto Parcelado' || formData.forma_pagamento === 'Cartão Parcelado') && (
              <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '25px', border: '1px solid #cbd5e1' }}>
                <label style={{...labelStyle, fontSize: '14px'}}>DEFINA AS PARCELAS (MÁX. 5)</label>
                <input 
                  type="number" min="1" max="5" placeholder="Qtd" 
                  style={{...glassInput, paddingLeft: '20px', marginBottom: '20px'}} 
                  onChange={(e) => setFormData({...formData, qtd_parcelas: Math.min(5, parseInt(e.target.value) || 1)})} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {Array.from({ length: formData.qtd_parcelas }).map((_, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', minWidth: '100px' }}>{i + 1}ª PARCELA:</span>
                        <input type="date" required style={{...glassInput, padding: '12px 15px'}} onChange={(e) => {
                            const d = [...datasParcelas]; d[i] = e.target.value; setDatasParcelas(d);
                        }} />
                      </div>
                    ))}
                </div>
              </div>
          )}

          <div>
            <label style={labelStyle}>OBSERVAÇÕES ADICIONAIS</label>
            <textarea placeholder="Ex: Cliente solicita envio por WhatsApp..." style={{...glassInput, paddingLeft: '20px', height:'100px', resize: 'none'}} onChange={(e)=>setFormData({...formData, obs: e.target.value})} />
          </div>

          <button disabled={loading} style={{ 
            background: '#0f172a', color: '#fff', padding: '22px', borderRadius: '18px', 
            border: 'none', fontWeight: '900', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}>
            {loading ? 'GERANDO CHAMADO...' : <><CheckCircle size={22}/> FINALIZAR E ENVIAR AO FLUXO</>}
          </button>

        </form>
      </div>
    </div>
  )
}