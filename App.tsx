import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

import {
  MD3LightTheme as DefaultTheme,
  PaperProvider,
  Button,
  withTheme as withThemePaper,
} from "react-native-paper";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#643843",
    secondary: "yellow",
    danger: "red",
    success: "green",
    warning: "orange",
    info: "blue",
    light: "white",
    dark: "black",
  },
};

export default function App() {
  const [db, setDb] = useState(SQLite.openDatabase("db1.db"));
  const [isloading, setIsloding] = useState(true);
  const [names, setNames] = useState([]);
  const [currentName, setCurrentName] = useState("");

  const exportDb = async () => {
    if (Platform.OS == "android") {
      const permission =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permission.granted) {
        const base64 = await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + "SQLite/db1.db",
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        );
        await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          "db1.db",
          "application/octet-stream"
        ).then(async (uri) => {
          FileSystem.writeAsStringAsync(uri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }).catch((error) => {
          console.log(error);
        });
      } else {
        Alert.alert("Error", "Permission not granted");
      }
    } else {
      await Sharing.shareAsync(FileSystem.documentDirectory + "SQLite/db1.db");
    }
  };

  const importDb = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (result.assets.length > 0) {
      if (
        !(
          await FileSystem.getInfoAsync(
            FileSystem.documentDirectory + "SQLite/db1.db"
          )
        ).exists
      ) {
        await FileSystem.makeDirectoryAsync(
          FileSystem.documentDirectory + "SQLite/"
        );
      }

      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + "SQLite/db1.db",
        base64,
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );

      await db.closeSync();

      setDb(SQLite.openDatabase("db1.db"));
    }
  };

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS names (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);"
      );
    });

    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM names;",
        [],
        (_, { rows }) => setNames(rows._array),
        (_, error) => false
      );
    });

    setIsloding(false);
  }, [db]);

  const saveName = async () => {
    if (currentName === "") {
      Alert.alert("Error", "Please enter a name");
      return;
    }
    db.transaction((tx) => {
      tx.executeSql(
        "insert into names (name) values (?)",
        [currentName],
        (txOnj, { insertId, rows }) => {
          setNames([...names, { id: insertId, name: currentName }]);
          setCurrentName("");
        },
        (txObj, error) => false
      );
    });
  };

  const onDelete = async (id) => {
    db.transaction((tx) => {
      tx.executeSql(
        "delete from names where id = ?;",
        [id],
        (txObj, resultSet) => {
          if (resultSet.rowsAffected > 0) {
            setNames(names.filter((item) => item.id !== id));
          }
        },
        (txObj, error) => false
      );
    });
  };

  const onUpdate = async (id) => {
    db.transaction((tx) => {
      tx.executeSql(
        "update names set name = ? where id = ?;",
        [currentName, id],
        (txObj, resultSet) => {
          if (resultSet.rowsAffected > 0) {
            setNames(names.filter((item) => item.id !== id));
          }
        },
        (txObj, error) => false
      );
    });
  };

  const showNames = () => {
    return names.map(({ id, name }) => {
      return (
        <View style={styles.rowContainer} key={id}>
          <Text style={styles.text}>{name}</Text>

          <View style={styles.buttonsStyle}>
            <Button
              onPress={() => onUpdate(id)}
              style={styles.buttonSecondaryStyle}
            >
              Edit
            </Button>
            <Button
              onPress={() => onDelete(id)}
              style={styles.buttonDangerStyle}
            >
              Delete
            </Button>
          </View>
        </View>
      );
    });
  };

  if (isloading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        <TextInput
          placeholder="Name"
          value={currentName}
          style={styles.inputContainer}
          onChangeText={setCurrentName}
        />
        <View style={{ gap: 2, flexDirection: "row", display: "flex" }}>
          <Button onPress={() => saveName()} style={styles.buttonPrimaryStyle}>
            <Text style={styles.textStyle}>Add Name</Text>
          </Button>
          <Button onPress={() => exportDb()} style={styles.buttonPrimaryStyle}>
            <Text style={styles.textStyle}>Export Database</Text>
          </Button>
          <Button onPress={() => importDb()} style={styles.buttonPrimaryStyle}>
            <Text style={styles.textStyle}>Import Database</Text>
          </Button>
        </View>

        {showNames()}
        <StatusBar style="auto" />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    width: "100%",
    height: "100%",
    alignItems: "center",
    backgroundColor: "#FDF0D1",
    justifyContent: "center",
  },
  inputContainer: {
    width: "80%",
    height: 40,
    borderColor: "black",
    borderWidth: 1,
    marginBottom: 12,
    padding: 4,
  },
  rowContainer: {
    display: "flex",
    marginBottom: 6,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  buttonsStyle: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  buttonPrimaryStyle: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
    color: "white",
    borderRadius: 4,
    elevation: 3,
    backgroundColor: "#643843",
  },
  buttonSecondaryStyle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 1,
    paddingHorizontal: 2,
    color: "white",
    borderRadius: 4,
    elevation: 3,
    backgroundColor: "orange",
  },
  buttonDangerStyle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 1,
    paddingHorizontal: 2,
    color: "white",
    borderRadius: 4,
    elevation: 3,
    backgroundColor: "red",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
  },
});
