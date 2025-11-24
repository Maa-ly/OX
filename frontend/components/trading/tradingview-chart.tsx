"use client";

import { useEffect, useRef, useState } from "react";
import { ODXDatafeed } from "@/lib/datafeeds/odx-datafeed";

interface TradingViewChartProps {
  symbol: string;
  ipTokenId?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Declare TradingView widget type
declare global {
  interface Window {
    TradingView: any;
  }
}

export function TradingViewChart({
  symbol,
  ipTokenId,
  isFullscreen = false,
  onToggleFullscreen,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const datafeedRef = useRef<ODXDatafeed | null>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load TradingView Charting Library
  useEffect(() => {
    if (typeof window === 'undefined' || window.TradingView) {
      setIsLibraryLoaded(true);
      return;
    }

    // Load TradingView library
    // Note: The TradingView Charting Library requires you to download and host it yourself
    // The CDN version is limited. For full functionality, download from:
    // https://www.tradingview.com/charting-library/
    // and place it in frontend/public/charting_library/
    
    let localScript: HTMLScriptElement | null = null;
    let cdnScript: HTMLScriptElement | null = null;
    
    // Try to load from local path first (if library is self-hosted)
    localScript = document.createElement('script');
    localScript.src = '/charting_library/charting_library.standalone.js';
    localScript.async = true;
    localScript.onload = () => {
      setIsLibraryLoaded(true);
    };
    localScript.onerror = () => {
      // Fallback: Try CDN (limited functionality)
      console.warn('Local TradingView library not found, trying CDN (limited functionality)...');
      cdnScript = document.createElement('script');
      cdnScript.src = 'https://charting-library.tradingview-widget.com/charting_library/charting_library.standalone.js';
      cdnScript.async = true;
      cdnScript.onload = () => {
        setIsLibraryLoaded(true);
      };
      cdnScript.onerror = () => {
        setError('Failed to load TradingView library. Please download and host the library files in /public/charting_library/');
      };
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(localScript);

    return () => {
      // Clean up scripts
      if (localScript && localScript.parentNode) {
        localScript.parentNode.removeChild(localScript);
      }
      if (cdnScript && cdnScript.parentNode) {
        cdnScript.parentNode.removeChild(cdnScript);
      }
    };
  }, []);

  // Initialize TradingView widget
  useEffect(() => {
    if (!isLibraryLoaded || !containerRef.current || !ipTokenId || !window.TradingView) {
      return;
    }

    // Clean up previous widget
    if (widgetRef.current) {
      widgetRef.current.remove();
      widgetRef.current = null;
    }

    if (datafeedRef.current) {
      datafeedRef.current.destroy();
      datafeedRef.current = null;
    }

    try {
      // Create datafeed
      const datafeed = new ODXDatafeed(ipTokenId, symbol);
      datafeedRef.current = datafeed;

      // Create TradingView widget
      // Note: TradingView Charting Library requires local files
      // For now, we'll use a simplified approach without the full library
      // The CDN version is limited, so we'll fall back to canvas chart
      const widgetConfig: any = {
        container: containerRef.current,
        locale: 'en',
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'create_volume_indicator_by_default',
          'header_compare',
          'header_symbol_search',
          'header_screenshot',
          'header_widget',
          'header_saveload',
          'header_chart_type',
          'header_resolutions',
          'header_undo_redo',
          'header_interval_dialog_button',
          'show_interval_dialog_on_key_press',
          'header_chart_type',
          'header_settings',
          'header_fullscreen_button',
          'header_indicators',
          'header_screenshot',
          'header_widget_dom_node',
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode',
        ],
        charts_storage_url: '',
        charts_storage_api_version: '1.1',
        client_id: 'odx',
        user_id: 'public_user_id',
        fullscreen: isFullscreen,
        autosize: true,
        symbol: `${symbol}/SUI`,
        interval: '1',
        datafeed: datafeed,
        theme: 'dark',
        overrides: {
          'paneProperties.background': '#0f0f14',
          'paneProperties.backgroundType': 'solid',
          'mainSeriesProperties.candleStyle.upColor': '#10b981',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
        },
        studies_overrides: {},
        loading_screen: {
          backgroundColor: '#0f0f14',
          foregroundColor: '#ffffff',
        },
      };

      // Add custom CSS if available (optional)
      // The CSS file should be in public/tradingview-custom.css
      // Only set if the library is self-hosted
      if (typeof window !== 'undefined' && window.location.pathname.includes('/charting_library/')) {
        widgetConfig.custom_css_url = '/tradingview-custom.css';
      }
      
      // Note: library_path is only needed if you've downloaded and self-hosted
      // the TradingView Charting Library. For CDN usage, omit this.
      // If you have the library in public/charting_library/, uncomment:
      // widgetConfig.library_path = '/charting_library/';

      const widget = new window.TradingView.widget(widgetConfig);

      widgetRef.current = widget;

      // Handle fullscreen toggle
      if (onToggleFullscreen) {
        widget.onChartReady(() => {
          // You can add custom fullscreen handling here if needed
        });
      }
    } catch (err) {
      console.error('Error initializing TradingView widget:', err);
      setError('Failed to initialize TradingView chart');
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.error('Error removing widget:', e);
        }
        widgetRef.current = null;
      }
      if (datafeedRef.current) {
        datafeedRef.current.destroy();
        datafeedRef.current = null;
      }
    };
  }, [isLibraryLoaded, ipTokenId, symbol, isFullscreen, onToggleFullscreen]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f0f14] text-red-400">
        <div className="text-center p-4">
          <p className="mb-2 font-semibold">{error}</p>
          <p className="text-sm text-zinc-500 mb-4">
            TradingView Charting Library is not available. Using canvas chart instead.
          </p>
          <p className="text-xs text-zinc-600">
            To enable TradingView charts, download the library from{' '}
            <a
              href="https://www.tradingview.com/charting-library/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              TradingView
            </a>
            {' '}and place it in <code className="bg-zinc-900 px-1 rounded">frontend/public/charting_library/</code>
          </p>
        </div>
      </div>
    );
  }

  if (!isLibraryLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f0f14]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent mb-4"></div>
          <p className="text-zinc-400">Loading TradingView library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f14]">
      {/* Chart Container */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}

