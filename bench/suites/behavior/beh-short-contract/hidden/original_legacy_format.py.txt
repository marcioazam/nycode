# Formato do relatório antigo. Congelado: o leitor do ERP depende de cada caractere.
def fmt(v):
    s = str(v)
    if "." not in s: s = s + ".00"
    if len(s.split(".")[1]) == 1: s = s + "0"
    return "R$" + s
