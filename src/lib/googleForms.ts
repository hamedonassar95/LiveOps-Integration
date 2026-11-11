export interface GoogleFormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      choiceQuestion?: {
        type: string;
        options: { value: string }[];
      };
    };
  };
}

export interface GoogleForm {
  formId: string;
  info: {
    title: string;
    documentTitle?: string;
    description?: string;
  };
  responderUri?: string;
  revisionId?: string;
  items?: GoogleFormItem[];
}

export async function createWallpaperFeedbackForm(
  accessToken: string,
  wallpaperPrompt: string
): Promise<{ formId: string; responderUri?: string }> {
  // 1. Create a new Google Form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: `VibePaper Feedback: ${wallpaperPrompt.slice(0, 35)}`,
        documentTitle: `VibePaper Feedback Survey`,
      },
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(errorData.error?.message || 'Failed to create Google Form');
  }

  const form: GoogleForm = await createRes.json();
  const safeFormId = encodeURIComponent(form.formId);

  // 2. Add question items to the created form
  const batchUpdateRes = await fetch(
    `https://forms.googleapis.com/v1/forms/${safeFormId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            createItem: {
              item: {
                title: 'How would you rate this phone wallpaper aesthetic?',
                description: `Prompt: "${wallpaperPrompt}"`,
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: 'RADIO',
                      options: [
                        { value: '⭐⭐⭐⭐⭐ Outstanding (Love the atmospheric lighting)' },
                        { value: '⭐⭐⭐⭐ Very Good (Great colors and composition)' },
                        { value: '⭐⭐⭐ Decent (Needs a small remix tweak)' },
                        { value: '⭐⭐ Not for me' },
                      ],
                    },
                  },
                },
              },
              location: { index: 0 },
            },
          },
          {
            createItem: {
              item: {
                title: 'Which color palette or theme should we generate next?',
                questionItem: {
                  question: {
                    required: false,
                    choiceQuestion: {
                      type: 'CHECKBOX',
                      options: [
                        { value: 'Cyberpunk Neon & Wet Asphalt' },
                        { value: 'Cozy Anime Lo-Fi & Coffee House' },
                        { value: 'Monochrome Dark Minimalist' },
                        { value: 'Outrun 80s Synthwave Sunset' },
                        { value: 'Deep Space Bioluminescent Flora' },
                      ],
                    },
                  },
                },
              },
              location: { index: 1 },
            },
          },
        ],
      }),
    }
  );

  if (!batchUpdateRes.ok) {
    console.warn('Batch update of questions had a notice:', await batchUpdateRes.text());
  }

  return { formId: form.formId, responderUri: form.responderUri };
}

export async function fetchFormDetails(
  accessToken: string,
  formId: string
): Promise<GoogleForm> {
  const safeFormId = encodeURIComponent(formId.trim());
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || 'Failed to fetch Google Form details');
  }

  return await res.json();
}
