<h1 align="center">vsystem container language</h1>

**vsystem container language** (vsysc) is a simple assembly language that can be used to control systems on https://vsys.oxvs.net.
These systems require a quick and simple language that can be used to control the system. Instructions in vsysc are executed line by line.
All reserved names should be only 2 characters long, but it is not required.

## Reserved names
- nm: name
- dc: data (variables)
- wl: write line
- ar: create array
- ad: add to array
- rm: remove from array
- im: import a file and run it (basically a function), an imported file will have access to `OUT_#` variables, which are supplied parameters
- ex: export a file, should be used when you want the file to be imported by another file as a function
- rt: return a value

## Syntax
`(int): (string): (string)`
```
ex: (0: NM: testName)
```

Variables can be referenced by using the `$` sign.<br>
`(int): (string): $(int)`
```
0: DC: testVariable
1: WL: $0
```

Arrays can be created by using the ar command. Adding to an array uses the same identifier as the array.<br>
`(int): (string): (any)`
```
0: AR: testArray
0: AD: test
0: AD: test2
```

## Note

vsysc is not a full language for completing tasks, and it is only used for storing data and processing it at the moment. It is not possible to use proper functions or other usual program tasks without using custom keywords for the language.
