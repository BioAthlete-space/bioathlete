# Règles pour l'IA

1. **ARCHIVAGE** : Après CHAQUE série de modifications majeures ou après avoir complété une tâche, l'IA DOIT regénérer l'archive ZIP du projet et la placer dans `G:\Mon Drive\bioathlete.zip`.
   - Commande recommandée (PowerShell) :
     ```powershell
     $tempDir = "C:\Users\kleve\AppData\Local\Temp\bioathlete_zip_temp\bioathlete"
     New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
     robocopy C:\Users\kleve\.gemini\antigravity\scratch\bioathlete $tempDir /MIR /XD node_modules .git .expo | Out-Null
     Compress-Archive -Path $tempDir -DestinationPath "G:\Mon Drive\bioathlete.zip" -Force
     Copy-Item "G:\Mon Drive\bioathlete.zip" "C:\Users\kleve\Desktop\bioathlete.zip" -Force
     Remove-Item -Path "C:\Users\kleve\AppData\Local\Temp\bioathlete_zip_temp" -Recurse -Force
     ```
