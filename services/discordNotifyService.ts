
export async function notifyDiscordRoll(
  charName: string, 
  testName: string, 
  total: number | string, 
  rollValue: number | string, 
  bonus: number
) {
  // Construindo uma mensagem com blocos visuais e separadores para o Discord
  const separator = "──────────────────────────────────";
  const content = `
${separator}
👤 **HERÓI:** \`${charName?.toUpperCase() || 'AVENTUREIRO'}\`
🎲 **ROLAGEM:** *${testName}*

# 🏆 TOTAL: **${total}**
> 📊 **Detalhes:** (🎲 ${rollValue} + ➕ Bônus: ${bonus})
${separator}
  `.trim();

  try {
    const response = await fetch('https://discord-sender--carlosjorge2611.replit.app/api/trigger-discord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      console.warn("Falha ao enviar notificação para o Discord");
    }
  } catch (error) {
    console.error("Erro na integração com Discord:", error);
  }
}
