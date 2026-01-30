'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovoPagarReceber() {
  const [tipo, setTipo] = useState('') 
  const [tipoNota, setTipoNota] = useState('') // 'servico', 'pecas', 'ambas'
  const [loading, setLoading] = useState(false)
  
  const [fileNFServ, setFileNFServ] = useState(null)
  const [fileNFPeca, setFileNFPeca] = useState(null)
  const [fileBoleto, setFileBoleto] = useState(null)
  const [fileReq, setFileReq] = useState(null)

  const [formData, setFormData] = useState({ entidade: '', valor: '', vencimento: '', motivo: '' })
  const router = useRouter()

  const upload = async (file, folder) => {
    if (!file) return null
    const path = `${folder}/${Date.now()}-${file.name}`
    await supabase.storage.from('anexos').upload(path, file)
    const { data } = supabase.storage.from('anexos').getPublicUrl(path)
    return data.publicUrl
  }

  const salvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tipo === 'pagar') {
        const nf = await upload(fileNFServ, 'pagar')
        const bol = await upload(fileBoleto, 'pagar')
        const req = await upload(fileReq, 'pagar')
        await supabase.from('finan_pagar').insert([{
          fornecedor: formData.entidade, valor: formData.valor, data_vencimento: formData.vencimento,
          motivo: formData.motivo, anexo_nf: nf, anexo_boleto: bol, anexo_requisicao: req
        }])
      } else {
        const nfS = await upload(fileNFServ, 'receber')
        const nfP = await upload(fileNFPeca, 'receber')
        await supabase.from('finan_receber').insert([{
          cliente: formData.entidade, valor: formData.valor, data_vencimento: formData.vencimento,
          motivo: formData.motivo, tipo_nota: tipoNota, anexo_nf_servico: nfS, anexo_nf_peca: nfP
        }])
      }
      alert("Sucesso!"); router.push('/')
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:'20px' }}>
      <div style={{ background:'#fff', padding:'40px', borderRadius:'35px', width:'100%', maxWidth:'550px', boxShadow:'0 20px 50px rgba(0,0,0,0.05)' }}>
        <h2 style={{textAlign:'center', color:'#14532d'}}>Novo Processo Financeiro</h2>
        
        <div style={{ display:'flex', gap:'15px', marginBottom:'30px' }}>
           <button onClick={()=>setTipo('pagar')} style={{ flex:1, padding:'15px', borderRadius:'12px', border: tipo === 'pagar' ? '2px solid #ef4444' : '1px solid #eee', background: tipo === 'pagar' ? '#fef2f2' : '#fff', fontWeight:'bold' }}>🔴 A PAGAR</button>
           <button onClick={()=>setTipo('receber')} style={{ flex:1, padding:'15px', borderRadius:'12px', border: tipo === 'receber' ? '2px solid #3b82f6' : '1px solid #eee', background: tipo === 'receber' ? '#eff6ff' : '#fff', fontWeight:'bold' }}>🔵 A RECEBER</button>
        </div>

        {tipo && (
          <form onSubmit={salvar} style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
            <input placeholder={tipo === 'pagar' ? "Fornecedor" : "Cliente"} required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} onChange={e=>setFormData({...formData, entidade: e.target.value})} />
            <input type="number" placeholder="Valor Total" required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} onChange={e=>setFormData({...formData, valor: e.target.value})} />
            <input type="date" required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} onChange={e=>setFormData({...formData, vencimento: e.target.value})} />
            
            <textarea placeholder="Explique melhor o motivo deste chamado..." required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd', height:'100px'}} onChange={e=>setFormData({...formData, motivo: e.target.value})} />

            {tipo === 'receber' && (
              <select required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} onChange={e=>setTipoNota(e.target.value)}>
                <option value="">QUAL NOTA VAI ANEXAR?</option>
                <option value="servico">Nota de Serviço</option>
                <option value="pecas">Nota de Peças</option>
                <option value="ambas">Ambas</option>
              </select>
            )}

            <div style={{ background:'#f9fafb', padding:'20px', borderRadius:'15px' }}>
               {(tipo === 'pagar' || tipoNota === 'servico' || tipoNota === 'ambas') && (
                 <div style={{marginBottom:'10px'}}><label>Nota de Serviço:</label><input type="file" required onChange={e=>setFileNFServ(e.target.files[0])} /></div>
               )}
               {(tipoNota === 'pecas' || tipoNota === 'ambas') && (
                 <div style={{marginBottom:'10px'}}><label>Nota de Peças:</label><input type="file" required onChange={e=>setFileNFPeca(e.target.files[0])} /></div>
               )}
               {tipo === 'pagar' && (
                 <>
                   <div style={{marginBottom:'10px'}}><label>Boleto:</label><input type="file" required onChange={e=>setFileBoleto(e.target.files[0])} /></div>
                   <div><label>Requisição:</label><input type="file" required onChange={e=>setFileReq(e.target.files[0])} /></div>
                 </>
               )}
            </div>

            <button disabled={loading} style={{ background: tipo === 'pagar' ? '#ef4444' : '#3b82f6', color:'#fff', border:'none', padding:'18px', borderRadius:'15px', fontWeight:'bold' }}>CRIAR NOVO PROCESSO</button>
            <button type="button" onClick={()=>router.push('/')} style={{ background:'none', border:'none', color:'#999', cursor:'pointer' }}>Cancelar e Voltar</button>
          </form>
        )}
      </div>
    </div>
  )
}