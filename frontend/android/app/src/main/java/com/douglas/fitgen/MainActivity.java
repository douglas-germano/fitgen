package com.douglas.fitgen;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Force edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Explicitly set transparent colors
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
        
        // Ensure the activity background is transparent/black to avoid white flash
        getWindow().getDecorView().setBackgroundColor(android.graphics.Color.BLACK);
    }
}
