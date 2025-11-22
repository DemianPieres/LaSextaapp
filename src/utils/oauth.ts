/**
 * Utilidades para autenticación OAuth con Facebook e Instagram
 */

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';
const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID || '';

export type SocialProvider = 'facebook' | 'instagram';

export type SocialAuthResult = {
  accessToken: string;
  socialId: string;
  email: string;
  nombre: string;
};

/**
 * Inicializa el SDK de Facebook
 */
function initFacebookSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/es_ES/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('No se pudo cargar el SDK de Facebook'));
    };
    
    document.body.appendChild(script);
  });
}

/**
 * Autenticación con Facebook
 */
export async function authenticateWithFacebook(): Promise<SocialAuthResult> {
  try {
    await initFacebookSDK();

    return new Promise((resolve, reject) => {
      window.FB.login(
        (response: any) => {
          if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;
            
            // Obtener información del usuario
            window.FB.api('/me', { fields: 'id,name,email' }, (userInfo: any) => {
              if (userInfo.error) {
                reject(new Error(userInfo.error.message || 'Error al obtener información del usuario'));
                return;
              }

              if (!userInfo.email) {
                reject(new Error('Facebook no proporcionó un email. Por favor, verifica los permisos de tu cuenta de Facebook.'));
                return;
              }

              resolve({
                accessToken,
                socialId: userInfo.id,
                email: userInfo.email,
                nombre: userInfo.name || 'Usuario de Facebook',
              });
            });
          } else {
            reject(new Error('No se pudo autenticar con Facebook. Por favor, intenta nuevamente.'));
          }
        },
        { scope: 'email,public_profile' }
      );
    });
  } catch (error: any) {
    throw new Error(error.message || 'Error al autenticar con Facebook');
  }
}

/**
 * Autenticación con Instagram
 * Nota: Instagram usa Facebook Login, así que usamos el mismo flujo
 */
export async function authenticateWithInstagram(): Promise<SocialAuthResult> {
  try {
    await initFacebookSDK();

    return new Promise((resolve, reject) => {
      window.FB.login(
        (response: any) => {
          if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;
            
            // Obtener información del usuario de Instagram
            window.FB.api('/me', { fields: 'id,name,email' }, async (userInfo: any) => {
              if (userInfo.error) {
                reject(new Error(userInfo.error.message || 'Error al obtener información del usuario'));
                return;
              }

              // Intentar obtener información de Instagram
              try {
                const instagramResponse = await fetch(
                  `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
                );

                if (instagramResponse.ok) {
                  const instagramData = await instagramResponse.json();
                  
                  resolve({
                    accessToken,
                    socialId: instagramData.id || userInfo.id,
                    email: userInfo.email || `${instagramData.username || userInfo.id}@instagram.com`,
                    nombre: instagramData.username || userInfo.name || 'Usuario de Instagram',
                  });
                } else {
                  // Si no se puede acceder a Instagram API, usar datos de Facebook
                  resolve({
                    accessToken,
                    socialId: userInfo.id,
                    email: userInfo.email || `${userInfo.id}@instagram.com`,
                    nombre: userInfo.name || 'Usuario de Instagram',
                  });
                }
              } catch (error) {
                // Fallback a datos de Facebook
                resolve({
                  accessToken,
                  socialId: userInfo.id,
                  email: userInfo.email || `${userInfo.id}@instagram.com`,
                  nombre: userInfo.name || 'Usuario de Instagram',
                });
              }
            });
          } else {
            reject(new Error('No se pudo autenticar con Instagram. Por favor, intenta nuevamente.'));
          }
        },
        { scope: 'email,public_profile,instagram_basic' }
      );
    });
  } catch (error: any) {
    throw new Error(error.message || 'Error al autenticar con Instagram');
  }
}

// Extender Window para incluir FB
declare global {
  interface Window {
    FB: any;
  }
}

