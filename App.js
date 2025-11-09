import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

const Tab = createBottomTabNavigator();

// ----------------------- ЛЕНТА -----------------------
function FeedScreen({ cart, setCart, purchases, setPurchases }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const products = [
    {
      id: "1",
      title: "Brewista Coffee",
      price: 249,
      image:
        "https://cdn-icons-png.flaticon.com/512/924/924514.png",
      desc: "Свежообжаренный кофе из Эфиопии. Копи с умом ☕️",
    },
    {
      id: "2",
      title: "iPhone Case",
      price: 119,
      image:
        "https://cdn-icons-png.flaticon.com/512/747/747376.png",
      desc: "Силиконовый чехол — надёжная защита и немного шика 📱",
    },
    {
      id: "3",
      title: "Reusable Bottle",
      price: 89,
      image:
        "https://cdn-icons-png.flaticon.com/512/3081/3081875.png",
      desc: "Металлическая бутылка для тех, кто заботится об экологии 💧",
    },
  ];

  const handleBuy = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const confirmPurchase = () => {
    setCart([...cart, selectedItem]);
    setPurchases([...purchases, selectedItem]);
    setShowModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleBuy(item)}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.price}>{item.price} SAR</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Модалка фейкового Apple Pay */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}> Pay</Text>
            <Text style={styles.modalSubtitle}>
              Оплатить {selectedItem?.title} за {selectedItem?.price} SAR?
            </Text>

            <TouchableOpacity
              style={styles.appleButton}
              onPress={confirmPurchase}
            >
              <Text style={styles.appleButtonText}>Оплатить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: "#888" }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------------- КОРЗИНА -----------------------
function CartScreen({ cart }) {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Корзина</Text>
      {cart.length === 0 ? (
        <Text style={{ color: "#999" }}>Пусто. Купи что-нибудь умное 🛍️</Text>
      ) : (
        <>
          {cart.map((item) => (
            <Text key={item.id} style={styles.itemText}>
              {item.title} — {item.price} SAR
            </Text>
          ))}
          <Text style={styles.total}>Итого: {total} SAR</Text>
        </>
      )}
    </View>
  );
}

// ----------------------- ПОКУПКИ -----------------------
function PurchasesScreen({ purchases }) {
  const saved = purchases.reduce((sum, item) => sum + item.price * 0.1, 0); // типа «сэкономил»
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Покупки</Text>
      <Text style={{ color: "#666", marginBottom: 20 }}>
        Хаха, не покупки — ваша экономия. Спасено: {saved.toFixed(1)} SAR 💰
      </Text>
      {purchases.length === 0 ? (
        <Text>Пока пусто. Но это тоже экономия.</Text>
      ) : (
        purchases.map((item) => (
          <Text key={item.id} style={styles.itemText}>
            ✅ {item.title} — {item.price} SAR
          </Text>
        ))
      )}
    </View>
  );
}

// ----------------------- ГЛАВНЫЙ APP -----------------------
export default function App() {
  const [cart, setCart] = useState([]);
  const [purchases, setPurchases] = useState([]);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#000",
          tabBarInactiveTintColor: "#777",
          tabBarStyle: { backgroundColor: "#fff", borderTopWidth: 0 },
        }}
      >
        <Tab.Screen name="Лента">
          {() => (
            <FeedScreen
              cart={cart}
              setCart={setCart}
              purchases={purchases}
              setPurchases={setPurchases}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Корзина">
          {() => <CartScreen cart={cart} />}
        </Tab.Screen>
        <Tab.Screen name="Покупки">
          {() => <PurchasesScreen purchases={purchases} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ----------------------- СТИЛИ -----------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    marginBottom: 15,
    padding: 15,
    alignItems: "center",
  },
  image: { width: 50, height: 50, marginRight: 15 },
  title: { fontSize: 18, fontWeight: "600", color: "#222" },
  price: { fontSize: 16, color: "#666" },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 15 },
  itemText: { fontSize: 16, marginVertical: 4 },
  total: { fontWeight: "700", marginTop: 10 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    width: "80%",
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 15,
  },
  appleButton: {
    backgroundColor: "black",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  appleButtonText: { color: "white", fontSize: 18, fontWeight: "600" },
});