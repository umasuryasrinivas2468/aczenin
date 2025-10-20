export interface SheetSubmissionResponse {
  result: 'success' | 'error';
  message: string;
}

export const submitPhoneNumber = async (phone: string): Promise<SheetSubmissionResponse> => {
  try {
    const webhook = import.meta.env.VITE_SHEET_WEBHOOK_URL as string | undefined;
    if (!webhook) {
      throw new Error('Webhook URL not configured');
    }

    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to submit phone number');
    }

    const data = await response.json();
    return {
      result: 'success',
      message: 'Phone number submitted successfully'
    };
  } catch (error: any) {
    console.error('Error submitting phone number:', error);
    return {
      result: 'error',
      message: error.message || 'Failed to submit phone number'
    };
  }
};