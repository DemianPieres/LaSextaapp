package io.ionic.starter;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private boolean isAppReady = false;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Instalar el splash screen antes de super.onCreate()
        // Solo funciona en API 31+ (Android 12+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
            
            // Configurar el splash screen para que se mantenga hasta que la app esté lista
            splashScreen.setKeepOnScreenCondition(() -> {
                // Mantener el splash hasta que la app esté completamente cargada
                return !isAppReady;
            });
            
            // Usar Handler para evitar bloquear el UI Thread
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                isAppReady = true;
            }, 2000); // Esperar 2 segundos sin bloquear
        }
        
        super.onCreate(savedInstanceState);
    }
}
