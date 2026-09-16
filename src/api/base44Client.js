// import { createClient } from '@base44/sdk';
// import { appParams } from '@/lib/app-params';

// const { appId, token, functionsVersion, appBaseUrl } = appParams;

// export const base44 = createClient({
//   appId,
//   token,
//   functionsVersion,
//   serverUrl: '',
//   appBaseUrl
// });
import { createClient } from '@base44/sdk';

import { appParams } from '@/lib/app-params';

export const base44 = createClient({
  appId: appParams.appId,
  headers: {
    Authorization: `Bearer ${appParams.token}`,
  },
});