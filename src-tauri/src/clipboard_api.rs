#[cfg(target_os = "macos")]
use {
    objc2::rc::{autoreleasepool, Retained},
    objc2::runtime::ProtocolObject,
    objc2::{msg_send, ClassType},
    objc2_app_kit::{NSPasteboard, NSPasteboardWriting},
    objc2_foundation::{NSArray, NSString, NSURL},
};

#[cfg(target_os = "windows")]
use {
    std::os::windows::ffi::OsStrExt,
    windows::{
        Win32::Foundation::{BOOL, HANDLE, HWND},
        Win32::System::Com::{CoInitialize, CoUninitialize},
        Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData},
        Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE},
        Win32::UI::Shell::DROPFILES,
    },
};

/// macOS専用：指定されたファイルパスをクリップボードに書き込むTauriコマンド
#[cfg(target_os = "macos")]
#[tauri::command]
pub fn set_clipboard_files(paths: Vec<String>) -> Result<(), String> {
    // メモリ管理のためautoreleasepool内で処理
    autoreleasepool(|_| {
        println!(
            "クリップボード操作を開始: {} 個のファイルパスを処理",
            paths.len()
        );

        // NSPasteboardを取得
        let pasteboard: Option<Retained<NSPasteboard>> =
            unsafe { msg_send![NSPasteboard::class(), generalPasteboard] };

        let pasteboard = pasteboard.ok_or("ペーストボードの取得に失敗しました")?;

        // 古い内容をクリア
        unsafe { pasteboard.clearContents() };

        // ファイルパスからNSURL配列を作成
        let ns_urls: Vec<Retained<NSURL>> = paths
            .iter()
            .map(|p| {
                let ns_string = NSString::from_str(p);
                unsafe { NSURL::fileURLWithPath(&ns_string) }
            })
            .collect();

        if ns_urls.is_empty() {
            return Err("有効なファイルパスがありません".to_string());
        }

        // URLをクリップボードに書き込み
        let url_array = unsafe {
            let ns_urls_slice: Vec<&NSURL> = ns_urls.iter().map(|url| url.as_ref()).collect();
            let url_array = NSArray::from_slice(&ns_urls_slice);

            #[allow(clippy::as_conversions)]
            let writing_array = &*(url_array.as_ref() as *const NSArray<NSURL>
                as *const NSArray<ProtocolObject<dyn NSPasteboardWriting>>);

            pasteboard.writeObjects(writing_array)
        };

        if url_array {
            println!("クリップボードへの書き込みが完了しました");
            Ok(())
        } else {
            Err("クリップボードへの書き込みに失敗しました".to_string())
        }
    })
}

/// Windows専用：指定されたファイルパスをクリップボードに書き込むTauriコマンド
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn set_clipboard_files(paths: Vec<String>) -> Result<(), String> {
    use std::path::Path;

    println!(
        "Starting clipboard operation: processing {} file paths",
        paths.len()
    );

    // COM初期化
    unsafe {
        let hr = CoInitialize(None);
        if hr.is_err() {
            return Err("Failed to initialize COM".to_string());
        }
    }

    let result = (|| -> Result<(), String> {
        // ファイルパスの検証
        for path in &paths {
            if !Path::new(path).exists() {
                return Err(format!("File not found: {}", path));
            }
        }

        // Windows Shell APIを使用してクリップボードにファイルを設定
        unsafe {
            // IDataObjectを作成してクリップボードに設定する簡易実装
            let clipboard = OpenClipboard(HWND::default());
            if clipboard.is_err() {
                return Err("Failed to open clipboard".to_string());
            }

            let empty_result = EmptyClipboard();
            if empty_result.is_err() {
                let _ = CloseClipboard();
                return Err("Failed to clear clipboard".to_string());
            }

            // CF_HDROPフォーマットでファイルパスを設定
            let cf_hdrop = 15u32; // CF_HDROP定数値
            
            // パス文字列を準備（各パスはNull終端、最後は二重Null終端）
            let mut buffer = Vec::new();
            let dropfiles_size = std::mem::size_of::<DROPFILES>();
            
            // DROPFILES構造体のサイズ分を確保
            buffer.resize(dropfiles_size, 0u8);
            
            for path in &paths {
                let wide_path: Vec<u16> = std::ffi::OsStr::new(path)
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect();
                
                let byte_slice = std::slice::from_raw_parts(
                    wide_path.as_ptr() as *const u8,
                    wide_path.len() * 2,
                );
                buffer.extend_from_slice(byte_slice);
            }
            
            // 最終的なNull終端を追加
            buffer.extend_from_slice(&[0u8, 0u8]);
            
            // DROPFILES構造体を設定
            let dropfiles = buffer.as_mut_ptr() as *mut DROPFILES;
            (*dropfiles).pFiles = dropfiles_size as u32;
            (*dropfiles).pt.x = 0;
            (*dropfiles).pt.y = 0;
            (*dropfiles).fNC = BOOL(0);
            (*dropfiles).fWide = BOOL(1); // Unicodeを使用

            // グローバルメモリにコピー
            let hmem = match GlobalAlloc(GMEM_MOVEABLE, buffer.len()) {
                Ok(h) => h,
                Err(_) => {
                    let _ = CloseClipboard();
                    return Err("Failed to allocate global memory".to_string());
                }
            };
            
            if hmem.is_invalid() {
                let _ = CloseClipboard();
                return Err("Failed to allocate global memory".to_string());
            }

            let ptr = GlobalLock(hmem);
            if ptr.is_null() {
                let _ = CloseClipboard();
                return Err("Failed to lock global memory".to_string());
            }

            std::ptr::copy_nonoverlapping(buffer.as_ptr(), ptr as *mut u8, buffer.len());
            GlobalUnlock(hmem).ok();

            // クリップボードにデータを設定
            let set_result = SetClipboardData(cf_hdrop, HANDLE(hmem.0));
            
            let _ = CloseClipboard();
            
            if let Err(_) = set_result {
                return Err("Failed to set clipboard data".to_string());
            }

            println!("Successfully copied files to clipboard");
            Ok(())
        }
    })();

    // COM終了処理
    unsafe {
        CoUninitialize();
    }

    result
}

/// macOSとWindows以外のプラットフォーム向けの互換性スタブ実装
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
#[tauri::command]
pub fn set_clipboard_files(paths: Vec<String>) -> Result<(), String> {
    Err("This feature is only supported on macOS and Windows".to_string())
}
