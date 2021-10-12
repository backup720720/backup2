const logToArea = (t, c = "#000000") => {
    document.getElementById("console").innerHTML =
        document.getElementById("console").innerHTML + `<span style="color: ${c}; font-size: 14px;">${t.replace(/</g, "&zwnj;<&zwnj;")}</span><br>`;
    document.getElementById("console").scrollTop = document.getElementById("console").scrollHeight;
}
const clearLogArea = () => document.getElementById("console").innerHTML = "";