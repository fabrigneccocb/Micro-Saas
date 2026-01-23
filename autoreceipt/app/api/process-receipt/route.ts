import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Configuración
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Usamos el cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileUrl, receiptId } = body;

    console.log("🚀 1. Recibido pedido para ID:", receiptId);

    if (!fileUrl || !receiptId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Llamar a OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Tu modelo económico
      messages: [
        {
          role: "system",
          content: `Eres un experto contable. Analiza la imagen y extrae en JSON:
          - merchant_name (string, nombre del comercio)
          - total_amount (number, solo el número)
          - date (string YYYY-MM-DD)
          - tax_amount (number)
          Si no encuentras algo, usa null.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analiza esta imagen:" },
            { type: "image_url", image_url: { url: fileUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("IA no devolvió contenido");
    
    const data = JSON.parse(content);
    console.log("✅ 2. Datos extraídos por IA:", data);

    // GUARDAR EN SUPABASE
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        merchant_name: data.merchant_name || 'Desconocido',
        total_amount: data.total_amount || 0,
        receipt_date: data.date || null, // Asegúrate de que tu tabla tenga esta columna
        tax_amount: data.tax_amount || 0,
        status: 'completed' // CAMBIO DE ESTADO IMPORTANTE
      })
      .eq('id', receiptId);

    if (updateError) {
      console.error("❌ 3. Error al guardar en BD:", updateError);
      throw updateError;
    }

    console.log("🎉 4. Guardado exitoso en BD");
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("🔥 Error General:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}