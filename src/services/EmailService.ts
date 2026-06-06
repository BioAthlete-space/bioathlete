import { supabase } from '../lib/supabase';

/**
 * Service d'envoi d'emails via Supabase Edge Functions (connecté à Brevo)
 */
export const EmailService = {
  async sendEmail({ to, subject, htmlContent, textContent }: { to: string; subject: string; htmlContent: string; textContent?: string; }) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject,
          htmlContent,
          textContent: textContent || htmlContent.replace(/<[^>]*>?/gm, '')
        }
      });
      if (error) return { success: false, error };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  async sendGroupInvitation(to: string, coachName: string, groupName: string, joinCode: string) {
    const subject = `${coachName} vous invite à rejoindre le groupe ${groupName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #0070f3; text-align: center;">Invitation BioAthlete</h2>
        <p>Bonjour,</p>
        <p>Votre coach <strong>${coachName}</strong> vous invite à rejoindre son groupe d'entraînement <strong>"${groupName}"</strong> sur l'application BioAthlete.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Votre code d'invitation secret :</p>
          <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #333;">${joinCode}</p>
        </div>
      </div>
    `;
    return this.sendEmail({ to, subject, htmlContent });
  }
};
