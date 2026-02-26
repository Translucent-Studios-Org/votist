import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

function getResend() {
	return new Resend(env.RESEND_API_KEY);
}

const FROM_ADDRESS = 'Votist Moderation <onboarding@votist.com>';

export async function sendWarningEmail(params: {
	to: string;
	userName: string;
	message: string;
	adminName: string;
}): Promise<{ success: boolean; error?: string }> {
	try {
		console.log(FROM_ADDRESS);
		const { error } = await getResend().emails.send({
			from: FROM_ADDRESS,
			to: params.to,
			subject: 'Warning from Votist Moderation',
			html: `
				<h2>Warning Notice</h2>
				<p>Hello ${params.userName},</p>
				<p>You have received a warning from a moderator regarding your activity on Votist.</p>
				<blockquote style="border-left: 3px solid #e5e7eb; padding-left: 16px; color: #4b5563;">
					${params.message}
				</blockquote>
				<p>Please review our community guidelines. Continued violations may result in suspension or ban.</p>
				<p>&mdash; ${params.adminName}, Votist Moderation Team</p>
			`
		});

		if (error) {
			console.error('Resend error:', error);
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: 'Failed to send email' };
	}
}

export async function sendBanNotificationEmail(params: {
	to: string;
	userName: string;
	reason: string;
	banType: 'permanent' | 'temporary';
	duration?: number;
}): Promise<{ success: boolean; error?: string }> {
	const durationText =
		params.banType === 'temporary'
			? `temporarily suspended for ${params.duration} day(s)`
			: 'permanently banned';

	try {
		const { error } = await getResend().emails.send({
			from: FROM_ADDRESS,
			to: params.to,
			subject: `Your Votist account has been ${params.banType === 'temporary' ? 'suspended' : 'banned'}`,
			html: `
				<h2>Account ${params.banType === 'temporary' ? 'Suspension' : 'Ban'} Notice</h2>
				<p>Hello ${params.userName},</p>
				<p>Your account has been ${durationText}.</p>
				<p><strong>Reason:</strong> ${params.reason}</p>
				${params.banType === 'temporary' ? `<p>Your suspension will be lifted automatically after ${params.duration} day(s).</p>` : ''}
				<p>If you believe this is an error, please contact support.</p>
				<p>&mdash; Votist Moderation Team</p>
			`
		});

		if (error) {
			console.error('Resend error:', error);
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: 'Failed to send email' };
	}
}
