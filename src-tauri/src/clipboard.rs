#[cfg(target_os = "macos")]
use {
    objc2::rc::{autoreleasepool, Retained},
    objc2::runtime::ProtocolObject,
    objc2::{msg_send, ClassType},
    objc2_app_kit::{NSPasteboard, NSPasteboardWriting},
    objc2_foundation::{NSArray, NSString, NSURL},
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

/// 非macOSプラットフォーム向けの互換性スタブ実装
#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn set_clipboard_files(paths: Vec<String>) -> Result<(), String> {
    Err("この機能は現在macOSのみでサポートされています".to_string())
}